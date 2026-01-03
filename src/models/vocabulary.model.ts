export interface Vocabulary {
    id: string;
    kanji: string;
    reading: string;
    meaning: string;
    frequency: number;
    containedKanji: string[];
}

export interface VocabProgress {
    vocabId: string;
    correctCount: number;
    lastReviewed: Date;
}