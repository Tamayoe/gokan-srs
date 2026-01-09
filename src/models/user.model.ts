import type {VocabProgress} from "./vocabulary.model.ts";

export interface UserProgress {
    kanjiKnowledge: KanjiKnowledge;
    activeQueue: VocabProgress[];
    learnedWords: Set<string>;
    stats: {
        totalLearned: number;
        totalReviews: number;
    };
}

export type KanjiLearningMethod = 'kklc' | 'rtk' | 'jlpt' | 'custom';

export interface KanjiKnowledge {
    method: KanjiLearningMethod;
    step: number;          // e.g. KKLC step reached
    kanjiSet: Set<string>; // actual kanji characters
}

export type LearningOrder =
    | 'frequency'
    | 'kklc';

export interface UserSettings {
    preferredLearningOrder: LearningOrder
}

export const DEFAULT_SETTINGS: UserSettings = {
    preferredLearningOrder: 'frequency',
};