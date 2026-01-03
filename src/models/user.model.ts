import type {VocabProgress} from "./vocabulary.model.ts";

export interface UserProgress {
    knownKanjiCount: number;
    activeQueue: VocabProgress[];
    learnedWords: Set<string>;
    stats: {
        totalLearned: number;
        totalReviews: number;
    };
}