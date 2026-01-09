import type {UserProgress, UserSettings} from "../models/user.model.ts";
import {CONSTANTS} from "../commons/constants.ts";

export class StorageService {
    static saveProgress(progress: UserProgress): void {
        const serialized = {
            ...progress,
            learnedWords: Array.from(progress.learnedWords),
        };
        localStorage.setItem(CONSTANTS.storage.progressStorageKey, JSON.stringify(serialized));
    }

    static loadProgress(): UserProgress | null {
        const stored = localStorage.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        return {
            ...parsed,
            learnedWords: new Set(parsed.learnedWords),
            activeQueue: parsed.activeQueue.map((item: any) => ({
                ...item,
                lastReviewed: new Date(item.lastReviewed),
            })),
        };
    }

    static clearProgress(): void {
        localStorage.removeItem(CONSTANTS.storage.progressStorageKey);
    }

    static saveSettings(settings: UserSettings): void {
        const serialized = {
            ...settings,
        };
        localStorage.setItem(CONSTANTS.storage.settingsStorageKey, JSON.stringify(serialized));
    }

    static loadSettings(): UserSettings | null {
        const stored = localStorage.getItem(CONSTANTS.storage.settingsStorageKey);
        if (!stored) return null;

        return JSON.parse(stored);
    }

    static clearSettings(): void {
        localStorage.removeItem(CONSTANTS.storage.settingsStorageKey);
    }
}