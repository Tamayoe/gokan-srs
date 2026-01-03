import type {UserProgress} from "../models/user.model.ts";

export class StorageService {
    private static readonly STORAGE_KEY = 'gokan-srs-progress';

    static saveProgress(progress: UserProgress): void {
        const serialized = {
            ...progress,
            learnedWords: Array.from(progress.learnedWords),
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized));
    }

    static loadProgress(): UserProgress | null {
        const stored = localStorage.getItem(this.STORAGE_KEY);
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
        localStorage.removeItem(this.STORAGE_KEY);
    }
}