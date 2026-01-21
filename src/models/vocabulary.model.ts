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


export interface ReviewLog {
    date: number;
    result: 'correct' | 'minor_error' | 'wrong' | 'pass';
    interval: number;
    latency: number; // ms
}

export interface SRSEntry {
    memoryStrength: number;
    interval: number; // days
    difficulty: number; // 0.0 (hard) to 1.0 (easy) - default 0.3
    lastReviewedAt: Date | null;
    dueDate: Date | null;
    history: ReviewLog[];
}

export interface VocabProgress {
    vocabId: string;
    stage: 'learning' | 'graduated';
    introductionAt: Date | null;
    nextReviewAt: Date | null;
    lastReviewedAt: Date | null;
    totalReviews: number;
    consecutiveFailures: number;

    // Detailed SRS data
    reading: SRSEntry;
    meaning: SRSEntry;
}

export const DEFAULT_SRS_ENTRY: SRSEntry = {
    memoryStrength: 1.0, // Default start strength (days)
    interval: 0,
    difficulty: 0.3, // Default difficulty
    lastReviewedAt: null,
    dueDate: null,
    history: []
};

export const DEFAULT_VOCABULARY_PROGRESS: VocabProgress = {
    vocabId: '',
    stage: 'learning',
    introductionAt: null,
    nextReviewAt: null,
    lastReviewedAt: null,
    totalReviews: 0,
    consecutiveFailures: 0,
    reading: { ...DEFAULT_SRS_ENTRY },
    meaning: { ...DEFAULT_SRS_ENTRY }
};