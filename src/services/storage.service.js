import { CONSTANTS } from "../commons/constants";
export class StorageService {
    static saveProgress(progress) {
        const serialized = {
            ...progress,
        };
        localStorage.setItem(CONSTANTS.storage.progressStorageKey, JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value));
    }
    static loadProgress() {
        const stored = localStorage.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored)
            return null;
        const parsed = JSON.parse(stored);
        const learningQueue = parsed.learningQueue.map(elem => ({
            ...elem,
            nextReviewAt: typeof elem.nextReviewAt === 'string' ? new Date(elem.nextReviewAt) : elem.nextReviewAt,
            lastReviewedAt: typeof elem.lastReviewedAt === 'string' ? new Date(elem.lastReviewedAt) : elem.lastReviewedAt
        }));
        return {
            ...parsed,
            kanjiKnowledge: {
                ...parsed.kanjiKnowledge,
                kanjiSet: new Set(parsed.kanjiKnowledge.kanjiSet)
            },
            learningQueue: learningQueue
        };
    }
    static clearProgress() {
        localStorage.removeItem(CONSTANTS.storage.progressStorageKey);
    }
    static saveSettings(settings) {
        const serialized = {
            ...settings,
        };
        localStorage.setItem(CONSTANTS.storage.settingsStorageKey, JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value));
    }
    static loadSettings() {
        const stored = localStorage.getItem(CONSTANTS.storage.settingsStorageKey);
        if (!stored)
            return null;
        return JSON.parse(stored);
    }
    static clearSettings() {
        localStorage.removeItem(CONSTANTS.storage.settingsStorageKey);
    }
}
