// Shared contract with gokan-srs's `src/models/vocabulary.model.ts` (see CLAUDE.md ->
// Project Structure -> the 5 shared model files are intentionally duplicated across both
// apps). This copy is trimmed to the dictionary's needs: it drops the SRS-only types
// (VocabProgress, SRSEntry, ReviewLog, NeedsRetryFlags, and their DEFAULT_* constants) since
// this app never tracks learning progress, and adds `isCommon`, a field the compiled dataset
// has always emitted (see gokan-dataset's docs/SCHEMA.md) but that gokan-srs's copy of this
// type still omits.

export interface Vocabulary {
    /** JMdict word ID (lexeme-level, stable) */
    id: string;

    /** Primary written form (common kanji form) */
    writtenForm: {
        kanji: string;
        alternatives: string[]; // alternative kanji writings
        containedKanji: string[];
    };

    /** Reading information */
    reading: {
        primary: string;        // main reading shown on intro card
        alternatives: string[]; // other valid readings (rare, secondary)
    };

    /** Frequency information */
    frequency: {
        kanjiRank: number;
        kanaRank?: number;
    };

    /** JLPT level (1=N1 hardest ... 5=N5 easiest), if this word is JLPT-tagged. Descriptive/display-only. */
    jlptLevel?: number;

    /** Learning order constraints (kept for data-shape parity; unused for display logic here) */
    progression: {
        kklcStep: number;
    };

    /** IDs of other vocabularies contained within this one */
    components?: string[];

    /** IDs of other vocabularies this word is a component of */
    parents?: string[];

    /** Linguistic senses (kept separate, structured) */
    senses: Sense[];

    /** Derived helpers for card generation (optional but useful) */
    usageHints?: UsageHints;

    /** If this entry is a unified merged entry from multiple homographs sharing the exact kanji form */
    mergedVocabs?: MergedVocabInfo[];

    /** True if JMDict marks this word (or an absorbed homograph) as common */
    isCommon: boolean;
}

export interface MergedVocabInfo {
    /** The original JMDict ID of the merged word */
    id: string;
    /** True if this was the highest frequency word that absorbed the others */
    isBase: boolean;
    /** The original primary reading for this specific word */
    originalPrimaryReading: string;
    /** A quick summary of what this specific reading meant (e.g. its main glosses) */
    originalGlosses: string[];
}

export interface Sense {
    /** Part(s) of speech for THIS sense */
    pos: string[];

    /** Register / usage flags (arch, abbr, suffix, etc.) */
    misc: {
        isAbbreviation?: boolean;
        isSuffix?: boolean;
        isPrefix?: boolean;
        isArchaic?: boolean;
        isRare?: boolean;
        rawTags: string[]; // kept for display/debug, not logic
    };

    /** Meanings, grouped by sense */
    glosses: string[];

    /** Structured related terms (for context generation) */
    related: {
        compounds: string[]; // e.g. 中学校, 中国
    };

    /** If this sense only applies to specific readings (used for disambiguating merged vocabs) */
    appliesToReadings?: string[];
}

export interface UsageHints {
    /** Suggested minimal context for intro card */
    examplePattern?: string; // e.g. "〜中", "Xの中"

    /** True if reading depends on context (homograph warning) */
    requiresContext: boolean;
}
