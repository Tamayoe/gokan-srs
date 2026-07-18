import type { UserProgress, UserSettings } from '../../models/user.model';

/** Sync-schema version (change-counter, not a vector clock). Distinct from
 *  MigrationService's data-format version - see docs in migration.service.ts. */
export interface SyncMetadata {
    lastModified: number;
    version: number;
}

export interface ProgressWithMetadata extends UserProgress {
    _sync?: SyncMetadata;
}

export interface SyncEnvelope {
    progress: ProgressWithMetadata;
    settings: UserSettings;
}

/** Custom error class for Google Drive authentication failures. */
export class GoogleAuthError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'GoogleAuthError';
        this.statusCode = statusCode;
    }
}
