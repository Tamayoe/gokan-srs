import type {UserProgress, UserSettings} from "../models/user.model";
import {CONSTANTS} from "../commons/constants";
import type {VocabProgress} from "../models/vocabulary.model";
import {DEFAULT_VOCABULARY_PROGRESS} from "../models/vocabulary.model";
import {DEFAULT_PROGRESS, DEFAULT_SETTINGS} from "../models/user.model";

export class StorageService {
    static saveProgress(progress: UserProgress): void {
        const serialized = {
            ...progress,
        };
        localStorage.setItem(CONSTANTS.storage.progressStorageKey, JSON.stringify(serialized, (_, value) => value instanceof Set ? [...value] : value));
    }

    static loadProgress(): UserProgress | null {
        const stored = localStorage.getItem(CONSTANTS.storage.progressStorageKey);
        if (!stored) return null;

        const parsed: UserProgress = JSON.parse(stored);
        const learningQueue: VocabProgress[]  = parsed.learningQueue.map(elem => ({
            ...DEFAULT_VOCABULARY_PROGRESS,
            ...elem,
            nextReviewAt: typeof elem.nextReviewAt === 'string' ? new Date(elem.nextReviewAt) : elem.nextReviewAt,
            lastReviewedAt: typeof elem.lastReviewedAt === 'string' ? new Date(elem.lastReviewedAt) : elem.lastReviewedAt
        }))
        return {
            ...DEFAULT_PROGRESS,
            ...parsed,
            kanjiKnowledge: {
                ...parsed.kanjiKnowledge,
                kanjiSet: new Set(parsed.kanjiKnowledge.kanjiSet)
            },
            learningQueue: learningQueue
        };
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

        return {
            ...DEFAULT_SETTINGS,
            ...JSON.parse(stored)
        };
    }

    static clearSettings(): void {
        localStorage.removeItem(CONSTANTS.storage.settingsStorageKey);
    }
}