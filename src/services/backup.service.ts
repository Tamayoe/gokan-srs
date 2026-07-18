/**
 * Write-once safety net for the pre-v8 -> v8+ migration wave.
 * Captures the exact raw (un-migrated) bytes a user had on disk before any
 * new migration logic ever touched them, so a bad migration can always be
 * rolled back from a pristine snapshot.
 */
export class BackupService {
    static readonly LOCAL_BACKUP_KEY = 'GOKAN_SRS_PROGRESS_BACKUP_PREV8';
    static readonly REMOTE_BACKUP_FILE_NAME = 'kanji-progress.pre-v8-backup.json';

    /**
     * Snapshots the raw progress JSON exactly once. Safe to call on every load -
     * it is a no-op once a backup already exists, and it never overwrites one.
     * Must be called with the RAW stored string, before any migration runs.
     */
    static ensureLocalBackupOnce(rawProgressJson: string | null): void {
        if (!rawProgressJson) return;
        if (localStorage.getItem(this.LOCAL_BACKUP_KEY)) return;

        try {
            localStorage.setItem(this.LOCAL_BACKUP_KEY, rawProgressJson);
        } catch (e) {
            // Best-effort: a full quota shouldn't block the app from loading.
            console.error('[BackupService] Failed to write local pre-v8 backup:', e);
        }
    }

    static hasLocalBackup(): boolean {
        return localStorage.getItem(this.LOCAL_BACKUP_KEY) !== null;
    }

    static getLocalBackupRaw(): string | null {
        return localStorage.getItem(this.LOCAL_BACKUP_KEY);
    }

    /** Settings are low-risk (no migrations rewrite them), but snapshot for completeness. */
    static ensureLocalSettingsBackupOnce(rawSettingsJson: string | null): void {
        const key = `${this.LOCAL_BACKUP_KEY}_SETTINGS`;
        if (!rawSettingsJson) return;
        if (localStorage.getItem(key)) return;
        try {
            localStorage.setItem(key, rawSettingsJson);
        } catch (e) {
            console.error('[BackupService] Failed to write local settings backup:', e);
        }
    }
}
