export interface Vocabulary {
    id: string;               // JMdict ID
    kanji: string;            // primary written form
    readings: string[];          // primary kana
    meanings: string[];       // multiple glosses
    frequency?: number;       // JPDB rank (lower = more frequent)
    hiraganaFrequency?: number;
    containedKanji: string[];
    pos?: string[];           // parts of speech
}

export interface VocabProgress {
    vocabId: string;
    stage: 'learning' | 'graduated';
    mastery: number; // 0 → 100
    nextReviewAt: Date | null;
    lastReviewedAt: Date | null;
    totalReviews: number;
    consecutiveFailures: number;
}