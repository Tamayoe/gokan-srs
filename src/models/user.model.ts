import type { VocabProgress } from "./vocabulary.model";

export interface UserProgress {
    kanjiKnowledge: KanjiKnowledge;

    /**
     * All vocab ever introduced to the user.
     * Includes:
     * - learning vocab
     * - review vocab
     * - mastered vocab (mastery === 100)
     */
    learningQueue: VocabProgress[];

    /**
     * Counters for progress
     * - learned: queue items (not just intro'd)
     * - graduated: longer interval items
     */
    stats: {
        /** Number of new vocab introduced today */
        newLearnedToday: number;

        /** Total vocab that reached mastery === 100 */
        totalLearned: number;

        totalReviews: number;
    };

    /** Allow user to bypass daily new vocab limit */
    dailyOverride: boolean;

    /** Data format version for migration tracking */
    _formatVersion?: number;

    /** Adaptive SRS Stats */
    adaptive: AdaptiveStats;
}

export interface AdaptiveStats {
    /** 
     * Global interval modifier (default 1.0).
     * < 1.0: Easymode (shorter intervals)
     * > 1.0: Hardmode (longer intervals)
     */
    level: number;

    /**
     * Rolling history of recent review results.
     * true = correct/minor_error (retention success)
     * false = wrong/pass (retention failure)
     */
    history: boolean[];
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
    preferredLearningOrder: LearningOrder;
    enableMeaningQuiz: boolean;
    learningFrequency: 'high' | 'medium' | 'low';
    geminiApiKey?: string;
    enableGeminiContext?: boolean;
    alwaysUseAiForMeaningContext?: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
    preferredLearningOrder: 'frequency',
    enableMeaningQuiz: true,
    learningFrequency: 'medium',
    enableGeminiContext: false,
    alwaysUseAiForMeaningContext: true,
};

export const DEFAULT_PROGRESS: Omit<UserProgress, 'kanjiKnowledge'> = {
    stats: {
        newLearnedToday: 0,
        totalLearned: 0,
        totalReviews: 0,
    },
    learningQueue: [],
    dailyOverride: false,
    adaptive: {
        level: 1.0,
        history: []
    }
}