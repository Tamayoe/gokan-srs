// Shared contract with gokan-srs's `src/models/kanji.model.ts` (see CLAUDE.md -> Project
// Structure -> the 5 shared model files are intentionally duplicated across both apps).
// Identical to the gokan-srs copy - nothing SRS-specific lives on this type.

export interface Kanji {
    character: string;
    steps: {
        kklc?: number;
        jlpt?: number;
        frequency?: number;
    };
    frequency?: number; // JPDB kanji frequency
}
