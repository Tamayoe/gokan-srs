export interface Vocabulary {
    /** JMdict word ID (lexeme-level, stable) */
    id: string;

    /** Primary written form (common kanji form) */
    writtenForm: {
        kanji: string;
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

    /** Learning order constraints */
    progression: {
        kklcStep: number;
    };

    /** Linguistic senses (kept separate, structured) */
    senses: Sense[];

    /** Derived helpers for card generation (optional but useful) */
    usageHints?: UsageHints;
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
}

export interface UsageHints {
    /** Suggested minimal context for intro card */
    examplePattern?: string; // e.g. "〜中", "Xの中"

    /** True if reading depends on context (homograph warning) */
    requiresContext: boolean;
}


export interface VocabProgress {
    vocabId: string;
    stage: 'learning' | 'graduated';
    mastery: number; // 0 → 100
    introductionAt: Date | null;
    nextReviewAt: Date | null;
    lastReviewedAt: Date | null;
    totalReviews: number;
    consecutiveFailures: number;
}

export const DEFAULT_VOCABULARY_PROGRESS: Omit<VocabProgress, 'vocabId'> = {
    stage: "learning",
    mastery: 0,
    introductionAt: null,
    nextReviewAt: new Date(),
    lastReviewedAt: null,
    totalReviews: 0,
    consecutiveFailures: 0,
};