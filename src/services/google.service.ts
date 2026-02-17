import type { UserProgress } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";
import { MigrationService } from "./migration.service";

const DRIVE_FILE_NAME = CONSTANTS.storage.googleDriveFileName;
const DRIVE_FOLDER_NAME = CONSTANTS.storage.googleDriveFolderName;

/**
 * Custom error class for Google Drive authentication failures
 */
export class GoogleAuthError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'GoogleAuthError';
        this.statusCode = statusCode;
    }
}

interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

interface SyncMetadata {
    lastModified: number;
    version: number;
}

interface ProgressWithMetadata extends UserProgress {
    _sync?: SyncMetadata;
}

export class GoogleDriveSync {
    private readonly accessToken: string;
    private fileId: string | null = null;
    private folderId: string | null = null;
    private latestLocalVersion: number = 0; // [NEW] Track the highest version we've seen/saved

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async initialize(): Promise<ProgressWithMetadata | null> {
        await this.ensureFolder();
        const remoteProgress = await this.fetchRemoteProgress();
        const localProgress = this.getLocalProgress();

        const merged = this.mergeProgress(localProgress, remoteProgress);

        // [NEW] Update our internal tracker
        if (merged?._sync?.version) {
            this.latestLocalVersion = merged._sync.version;
        }

        return merged;
    }

    async sync(localProgress: ProgressWithMetadata): Promise<ProgressWithMetadata | null> {
        // [NEW] OPTIMISTIC VERSIONING
        // If the incoming localProgress has a version LOWER than what we know we've saved,
        // it means the React State is stale (metadata-wise) but the Content is fresh (user just typed).
        // We must pretend this stale-metadata state is actually the LATEST version to win the merge war.
        const incomingVersion = localProgress._sync?.version ?? 0;
        let effectiveLocal = localProgress;

        if (incomingVersion < this.latestLocalVersion) {
            console.log(`[GoogleDriveSync] Stale metadata detected (Incoming: ${incomingVersion}, Known: ${this.latestLocalVersion}). Patching version...`);
            effectiveLocal = {
                ...localProgress,
                _sync: {
                    lastModified: Date.now(),
                    version: this.latestLocalVersion // We intentionally catch up to the known version
                }
            };
        }

        const remoteProgress = await this.fetchRemoteProgress();
        const merged = this.mergeProgress(effectiveLocal, remoteProgress);

        if (merged) {
            await this.uploadProgress(merged);
            this.saveLocalProgress(merged);

            // [NEW] Update tracker
            if (merged._sync?.version) {
                this.latestLocalVersion = merged._sync.version;
            }
        }

        return merged;
    }

    private mergeProgress(
        local: ProgressWithMetadata | null,
        remote: ProgressWithMetadata | null
    ): ProgressWithMetadata | null {
        if (!local && !remote) return null;
        if (!local) return this.addSyncMetadata(remote!);
        if (!remote) return this.addSyncMetadata(local);

        // ALWAYS deep merge to prevent data loss (e.g. fresh setup overwriting old backup)
        // We trust the deepMerge to take the "best" of both worlds (max stats, union of words)
        return this.deepMerge(local, remote);
    }

    private deepMerge(
        local: ProgressWithMetadata,
        remote: ProgressWithMetadata
    ): ProgressWithMetadata {
        // Create a map to merge vocab items by vocabId
        const vocabMap = new Map<string, any>();

        // Add all local vocab items to the map
        for (const item of local.learningQueue) {
            vocabMap.set(item.vocabId, { source: 'local', item });
        }

        // Process remote vocab items
        for (const remoteItem of remote.learningQueue) {
            const existing = vocabMap.get(remoteItem.vocabId);

            if (!existing) {
                // New vocab item only in remote
                vocabMap.set(remoteItem.vocabId, { source: 'remote', item: remoteItem });
            } else {
                // Vocab exists in both - determine which is more recent
                const localItem = existing.item;

                // Compare lastReviewedAt timestamps
                const localReviewTime = localItem.lastReviewedAt ? new Date(localItem.lastReviewedAt).getTime() : 0;
                const remoteReviewTime = remoteItem.lastReviewedAt ? new Date(remoteItem.lastReviewedAt).getTime() : 0;

                if (remoteReviewTime > localReviewTime) {
                    // Remote is more recent, use it
                    vocabMap.set(remoteItem.vocabId, { source: 'remote', item: remoteItem });
                } else if (localReviewTime === 0 && remoteReviewTime === 0) {
                    // Both have never been reviewed, compare introductionAt
                    const localIntroTime = localItem.introductionAt ? new Date(localItem.introductionAt).getTime() : 0;
                    const remoteIntroTime = remoteItem.introductionAt ? new Date(remoteItem.introductionAt).getTime() : 0;

                    if (remoteIntroTime > localIntroTime) {
                        vocabMap.set(remoteItem.vocabId, { source: 'remote', item: remoteItem });
                    }
                    // Otherwise keep local (already in map)
                }
                // Otherwise keep local (already in map)
            }
        }

        // Extract merged vocab items from the map
        const mergedQueue = Array.from(vocabMap.values()).map(entry => entry.item);

        // Kanji Knowledge Merging Strategy: Last Version Wins
        // This allows deletions (e.g. reducing step count) to propagate.
        const localVersion = local._sync?.version ?? 0;
        const remoteVersion = remote._sync?.version ?? 0;

        let mergedKanjiKnowledge = local.kanjiKnowledge;

        if (remoteVersion > localVersion) {
            // Remote is newer, trust it entirely
            mergedKanjiKnowledge = remote.kanjiKnowledge;
        }
        // If versions match, we trust LOCAL.
        // Reason: In this app's architecture, "local" contains the latest user edits 
        // that haven't been pushed yet. If we Union here, we revert deletions.
        // So we do nothing (keep initialized local.kanjiKnowledge).
        // else localVersion > remoteVersion: Keep local (default)

        const result: ProgressWithMetadata = {
            ...local,
            stats: {
                totalReviews: Math.max(local.stats?.totalReviews ?? 0, remote.stats?.totalReviews ?? 0),
                totalLearned: Math.max(local.stats?.totalLearned ?? 0, remote.stats?.totalLearned ?? 0),
                newLearnedToday: Math.max(local.stats?.newLearnedToday ?? 0, remote.stats?.newLearnedToday ?? 0),
            },
            kanjiKnowledge: mergedKanjiKnowledge,
            learningQueue: mergedQueue,
            // Combine overrides cautiously - if either has it true, user probably wants it
            dailyOverride: local.dailyOverride || remote.dailyOverride,
            _sync: {
                lastModified: Date.now(),
                version: Math.max(local._sync?.version ?? 0, remote._sync?.version ?? 0) + 1
            }
        };

        return result;
    }

    private addSyncMetadata(progress: UserProgress): ProgressWithMetadata {
        return {
            ...progress,
            _sync: {
                lastModified: Date.now(),
                version: ((progress as ProgressWithMetadata)._sync?.version ?? 0) + 1
            }
        };
    }

    private async ensureFolder(): Promise<void> {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new GoogleAuthError('Authentication failed or token expired', response.status);
            }
            throw new Error(`Failed to list folders: ${response.status}`);
        }

        const { files } = await response.json();

        if (files?.length > 0) {
            this.folderId = files[0].id;
        } else {
            this.folderId = await this.createFolder();
        }
    }

    private async createFolder(): Promise<string> {
        const response = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: DRIVE_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            }
        );

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new GoogleAuthError('Authentication failed or token expired', response.status);
            }
            throw new Error(`Failed to create folder: ${response.status}`);
        }

        const { id } = await response.json();
        return id;
    }

    private async fetchRemoteProgress(): Promise<ProgressWithMetadata | null> {
        if (!this.folderId) await this.ensureFolder();

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and '${this.folderId}' in parents and trashed=false`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new GoogleAuthError('Authentication failed or token expired', response.status);
            }
            throw new Error(`Failed to list files: ${response.status}`);
        }

        const { files }: { files: DriveFile[] } = await response.json();

        if (!files?.length) return null;

        this.fileId = files[0].id;

        const contentResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        if (!contentResponse.ok) {
            if (contentResponse.status === 401 || contentResponse.status === 403) {
                throw new GoogleAuthError('Authentication failed or token expired', contentResponse.status);
            }
            throw new Error(`Failed to fetch file content: ${contentResponse.status}`);
        }

        const data = await contentResponse.json();
        return this.deserialize(data);
    }

    private async uploadProgress(progress: ProgressWithMetadata): Promise<void> {
        if (!this.folderId) await this.ensureFolder();

        const serialized = this.serialize(progress);

        const metadata: any = {
            name: DRIVE_FILE_NAME,
            mimeType: 'application/json'
        };

        if (!this.fileId) {
            metadata.parents = [this.folderId];
        }

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(serialized)], { type: 'application/json' }));

        const url = this.fileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${this.fileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const response = await fetch(url, {
            method: this.fileId ? 'PATCH' : 'POST',
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new GoogleAuthError('Authentication failed or token expired', response.status);
            }
            throw new Error(`Failed to upload progress: ${response.status}`);
        }

        if (!this.fileId && response.ok) {
            const result = await response.json();
            this.fileId = result.id;
        }
    }

    private getLocalProgress(): ProgressWithMetadata | null {
        const stored = localStorage.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored) return null;
        return this.deserialize(JSON.parse(stored));
    }

    private saveLocalProgress(progress: ProgressWithMetadata): void {
        const serialized = this.serialize(progress);
        localStorage.setItem(CONSTANTS.storage.progressStorageKey, JSON.stringify(serialized));
    }

    // Helper to request JSON serialization
    private serialize(progress: ProgressWithMetadata): any {
        return JSON.parse(JSON.stringify(progress, (_key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }));
    }

    // Helper to handle JSON deserialization (restoring Sets and Dates)
    private deserialize(data: any): ProgressWithMetadata {
        // 1. Apply migration first (handles raw JSON structure)
        const migrated = MigrationService.migrateUserProgress(data);

        // 2. Hydrate Dates and Sets
        return {
            ...migrated,
            kanjiKnowledge: {
                ...migrated.kanjiKnowledge,
                kanjiSet: new Set(migrated.kanjiKnowledge?.kanjiSet || [])
            },
            learningQueue: (migrated.learningQueue || []).map((item: any) => ({
                ...item,
                nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : item.nextReviewAt,
                lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt) : item.lastReviewedAt,
                introductionAt: item.introductionAt ? new Date(item.introductionAt) : item.introductionAt,
                reading: {
                    ...item.reading,
                    lastReviewedAt: item.reading?.lastReviewedAt ? new Date(item.reading.lastReviewedAt) : null,
                    dueDate: item.reading?.dueDate ? new Date(item.reading.dueDate) : null
                },
                meaning: {
                    ...item.meaning,
                    lastReviewedAt: item.meaning?.lastReviewedAt ? new Date(item.meaning.lastReviewedAt) : null,
                    dueDate: item.meaning?.dueDate ? new Date(item.meaning.dueDate) : null
                }
            }))
        };
    }
}

// Usage in React component:
/*
import { useGoogleLogin } from '@react-oauth/google';

const useDriveSync = () => {
    const [syncing, setSyncing] = useState(false);
    const [syncService, setSyncService] = useState<GoogleDriveSync | null>(null);

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/drive.file',
        onSuccess: async ({ access_token }) => {
            setSyncing(true);
            const service = new GoogleDriveSync(access_token);
            const merged = await service.initialize();

            if (merged) {
                // Update your app state with merged progress
                setProgress(merged);
            }

            setSyncService(service);
            setSyncing(false);
        }
    });

    const sync = async (currentProgress: Progress) => {
        if (!syncService) return;
        await syncService.sync(currentProgress);
    };

    return { login, sync, syncing, isConnected: !!syncService };
};
*/