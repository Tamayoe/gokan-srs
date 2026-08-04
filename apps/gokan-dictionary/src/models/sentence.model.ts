// Shared contract with gokan-srs's `src/models/sentence.model.ts` (see CLAUDE.md -> Project
// Structure -> the 5 shared model files are intentionally duplicated across both apps).
// Identical to the gokan-srs copy.

export interface Sentence {
    id: string;       // source sentence ID
    original: string; // Japanese text
    en: {
        id: string;     // EN_ID from source
        text: string;   // English translation
    }[];
    indices?: string; // Reading hints/furigana string, if available
    vocabIds: string[]; // List of constituent vocab IDs (for containment checks)
    matches?: Record<string, { start: number, length: number, reading?: string }[]>; // vocabId -> match locations (for highlighting)
}

export interface SentenceSet {
    vocabId: string;
    sentences: Sentence[];
}
