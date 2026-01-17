import type { UserProgress } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";

const DRIVE_FILE_NAME = CONSTANTS.storage.googleDriveFileName;
const DRIVE_FOLDER_NAME = CONSTANTS.storage.googleDriveFolderName;

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

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async initialize(): Promise<ProgressWithMetadata | null> {
        await this.ensureFolder();
        const remoteProgress = await this.fetchRemoteProgress();
        const localProgress = this.getLocalProgress();

        return this.mergeProgress(localProgress, remoteProgress);
    }

    async sync(localProgress: ProgressWithMetadata): Promise<void> {
        const remoteProgress = await this.fetchRemoteProgress();
        const merged = this.mergeProgress(localProgress, remoteProgress);

        if (merged) {
            await this.uploadProgress(merged);
            this.saveLocalProgress(merged);
        }
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
        const result: ProgressWithMetadata = {
            ...local,
            stats: {
                totalReviews: Math.max(local.stats?.totalReviews ?? 0, remote.stats?.totalReviews ?? 0),
                totalLearned: Math.max(local.stats?.totalLearned ?? 0, remote.stats?.totalLearned ?? 0),
                newLearnedToday: Math.max(local.stats?.newLearnedToday ?? 0, remote.stats?.newLearnedToday ?? 0),
            },
            kanjiKnowledge: {
                ...local.kanjiKnowledge,
                kanjiSet: new Set([
                    ...(local.kanjiKnowledge?.kanjiSet ?? []),
                    ...(remote.kanjiKnowledge?.kanjiSet ?? [])
                ])
            },
            learningQueue: [
                ...local.learningQueue,
                ...remote.learningQueue.filter(r => !local.learningQueue.some(l => l.vocabId === r.vocabId))
            ],
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

        const { id } = await response.json();
        return id;
    }

    private async fetchRemoteProgress(): Promise<ProgressWithMetadata | null> {
        if (!this.folderId) await this.ensureFolder();

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FILE_NAME}' and '${this.folderId}' in parents and trashed=false`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

        const { files }: { files: DriveFile[] } = await response.json();

        if (!files?.length) return null;

        this.fileId = files[0].id;

        const contentResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${this.fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );

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
        return {
            ...data,
            kanjiKnowledge: {
                ...data.kanjiKnowledge,
                kanjiSet: new Set(data.kanjiKnowledge?.kanjiSet || [])
            },
            learningQueue: (data.learningQueue || []).map((item: any) => ({
                ...item,
                nextReviewAt: item.nextReviewAt ? new Date(item.nextReviewAt) : item.nextReviewAt,
                lastReviewedAt: item.lastReviewedAt ? new Date(item.lastReviewedAt) : item.lastReviewedAt
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