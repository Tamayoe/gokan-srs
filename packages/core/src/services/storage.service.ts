import type { UserProgress, UserSettings } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";
import type { VocabProgress } from "../models/vocabulary.model";
import { DEFAULT_VOCABULARY_PROGRESS } from "../models/vocabulary.model";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS } from "../models/user.model";
import { MigrationService } from "./migration.service";
import type { StorageAdapter } from "../adapters/storage.adapter";

/**
 * Platform-agnostic storage service.
 *
 * Call StorageService.configure(adapter) once at app startup:
 *   - Web:    StorageService.configure(localStorageAdapter)
 *   - Mobile: StorageService.configure(mmkvAdapter)
 */
export class StorageService {
    private static _adapter: StorageAdapter | null = null;

    static configure(adapter: StorageAdapter): void {
        this._adapter = adapter;
    }

    private static get adapter(): StorageAdapter {
        if (!this._adapter) {
            // Fallback to localStorage for web (avoids breaking web if configure() isn't called yet)
            if (typeof localStorage !== 'undefined') {
                return {
                    getItem: (key) => localStorage.getItem(key),
                    setItem: (key, value) => localStorage.setItem(key, value),
                    removeItem: (key) => localStorage.removeItem(key),
                };
            }
            throw new Error('[StorageService] No adapter configured. Call StorageService.configure(adapter) before using StorageService.');
        }
        return this._adapter;
    }

    static saveProgress(progress: UserProgress): void {
        const serialized = { ...progress };
        this.adapter.setItem(
            CONSTANTS.storage.progressStorageKey,
            JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value)
        );
    }

    static loadProgress(): UserProgress | null {
        const stored = this.adapter.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored) return null;

        const parsed: any = JSON.parse(stored);

        // Apply migration if needed
        const migrated = MigrationService.migrateUserProgress(parsed);

        // Convert date strings to Date objects
        const learningQueue: VocabProgress[] = migrated.learningQueue.map((elem: any) => ({
            ...DEFAULT_VOCABULARY_PROGRESS,
            ...elem,
            nextReviewAt: typeof elem.nextReviewAt === 'string' ? new Date(elem.nextReviewAt) : elem.nextReviewAt,
            lastReviewedAt: typeof elem.lastReviewedAt === 'string' ? new Date(elem.lastReviewedAt) : elem.lastReviewedAt,
            introductionAt: typeof elem.introductionAt === 'string' ? new Date(elem.introductionAt) : elem.introductionAt,
            reading: {
                ...elem.reading,
                lastReviewedAt: elem.reading?.lastReviewedAt && typeof elem.reading.lastReviewedAt === 'string'
                    ? new Date(elem.reading.lastReviewedAt)
                    : elem.reading?.lastReviewedAt,
                dueDate: elem.reading?.dueDate && typeof elem.reading.dueDate === 'string'
                    ? new Date(elem.reading.dueDate)
                    : elem.reading?.dueDate
            },
            meaning: {
                ...elem.meaning,
                lastReviewedAt: elem.meaning?.lastReviewedAt && typeof elem.meaning.lastReviewedAt === 'string'
                    ? new Date(elem.meaning.lastReviewedAt)
                    : elem.meaning?.lastReviewedAt,
                dueDate: elem.meaning?.dueDate && typeof elem.meaning.dueDate === 'string'
                    ? new Date(elem.meaning.dueDate)
                    : elem.meaning?.dueDate
            }
        }));

        return {
            ...DEFAULT_PROGRESS,
            ...migrated,
            kanjiKnowledge: {
                ...migrated.kanjiKnowledge,
                kanjiSet: new Set(migrated.kanjiKnowledge.kanjiSet)
            },
            learningQueue
        };
    }

    static clearProgress(): void {
        this.adapter.removeItem(CONSTANTS.storage.progressStorageKey);
    }

    static saveSettings(settings: UserSettings): void {
        const serialized = { ...settings };
        this.adapter.setItem(
            CONSTANTS.storage.settingsStorageKey,
            JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value)
        );
    }

    static loadSettings(): UserSettings | null {
        const stored = this.adapter.getItem(CONSTANTS.storage.settingsStorageKey);
        if (!stored) return null;

        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored)
        };
    }

    static clearSettings(): void {
        this.adapter.removeItem(CONSTANTS.storage.settingsStorageKey);
    }

    // Raw adapter access for one-off keys (e.g. last access date tracking)
    static getRaw(key: string): string | null {
        return this.adapter.getItem(key);
    }

    static setRaw(key: string, value: string): void {
        this.adapter.setItem(key, value);
    }
}
