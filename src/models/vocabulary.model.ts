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
    correctCount: number;
    lastReviewed: Date;
    graduated?: boolean;
}