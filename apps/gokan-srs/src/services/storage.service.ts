import type { UserProgress, UserSettings } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";
import { DEFAULT_SETTINGS } from "../models/user.model";
import { BackupService } from "./backup.service";
import { toPlainProgressJSON, migrateAndHydrateProgress } from "./progressSerialization";

export class StorageService {
    static saveProgress(progress: UserProgress): void {
        localStorage.setItem(CONSTANTS.storage.progressStorageKey, JSON.stringify(toPlainProgressJSON(progress)));
    }

    static loadProgress(): UserProgress | null {
        const stored = localStorage.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored) return null;

        // Snapshot the raw pre-migration bytes exactly once, before anything (including
        // this load) has a chance to rewrite them. No-op after the first successful call.
        BackupService.ensureLocalBackupOnce(stored);

        const parsed: any = JSON.parse(stored);
        // Settings must inform the migration pass's nextReviewAt re-derivation,
        // or a disabled meaning quiz makes every load disagree with every merge.
        return migrateAndHydrateProgress(parsed, this.loadSettings() ?? undefined);
    }

    static clearProgress(): void {
        localStorage.removeItem(CONSTANTS.storage.progressStorageKey);
    }

    static saveSettings(settings: UserSettings): void {
        const serialized = {
            ...settings,
        };
        localStorage.setItem(CONSTANTS.storage.settingsStorageKey, JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value));
    }

    static loadSettings(): UserSettings | null {
        const stored = localStorage.getItem(CONSTANTS.storage.settingsStorageKey);
        if (!stored) return null;

        BackupService.ensureLocalSettingsBackupOnce(stored);

        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored)
        };
    }

    static clearSettings(): void {
        localStorage.removeItem(CONSTANTS.storage.settingsStorageKey);
    }
}