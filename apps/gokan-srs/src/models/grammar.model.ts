import { DEFAULT_SRS_ENTRY } from './vocabulary.model';
import type { SRSEntry } from './vocabulary.model';

/**
 * One tokenized word within a GrammarExample's Japanese sentence. `vocabId` is
 * resolved at build time by matching this word's surface/dictionary form against
 * the compiled vocab dataset - null for particles, symbols, and anything that
 * couldn't be resolved, which are always shown literally and never turned into
 * a blank. Concatenating every word's `surface` in order reconstructs the
 * example's `jp` string exactly.
 */
export interface GrammarExampleWord {
    surface: string;
    vocabId: string | null;
    /** The matched vocab's primary reading (hiragana) - only set when vocabId is set. Used to grade a blank without a runtime vocab fetch. */
    reading?: string;
    /** Kuromoji's dictionary/base form (e.g. "思う" for the conjugated token "思っ"), only set when it differs from `surface`. Currently unused at runtime - captured for parity with the dataset schema, which uses it for build-time pattern-word matching (see `patternWordIndices` below). */
    baseForm?: string;
}

export interface GrammarExample {
    jp: string;
    romaji: string;
    en: string;
    words: GrammarExampleWord[];
    /**
     * Indices into `words[]` identifying this example's grammar-pattern markers
     * (the literal, invariant part of the point's `formation` - e.g. が and
     * いちばん for "Noun + が + いちばん + Adjective/Verb"), precomputed at
     * dataset build time by matching `formation` against `words[]`. Always
     * present (possibly empty) - the app never re-derives this. Empty means the
     * pattern couldn't be confidently located in this specific example (rare -
     * 98.1% of examples have it non-empty as of the dataset's last build; see
     * `computeBlankPlan`'s fallback chain in grammarSelectors.ts for what
     * happens then).
     */
    patternWordIndices: number[];
}

/**
 * A single grammar point (e.g. "A が いちばん～"). Sourced from the
 * hanabira.org-japanese-content dataset (CC license, attribution required -
 * see the credit link on the About page) - see CLAUDE.md's Grammar section
 * for the full ingestion story.
 */
export interface GrammarPoint {
    /** Stable id assigned at build time from this vendored snapshot (e.g. "n5-001") - the upstream dataset has no ids of its own. */
    id: string;
    title: string;
    /** JLPT level (1 = N1 hardest .. 5 = N5 easiest), matching Vocabulary.jlptLevel's convention. Every grammar point carries one, since this dataset is itself organized by level. */
    jlptLevel: number;
    shortExplanation: string;
    longExplanation: string;
    /** Formation template shown to the user, e.g. "Noun + が + いちばん + Adjective/Verb". */
    formation: string;
    examples: GrammarExample[];
}

/** JLPT level (1..5) -> grammar point ids, in the source's original order (alphabetical - grammar has no frequency data to sort by, unlike vocab). */
export type GrammarJlptIndex = Record<number, string[]>;

export const GRAMMAR_JLPT_LEVELS = [5, 4, 3, 2, 1] as const;

/**
 * User's SRS progress for one grammar point. Mirrors VocabProgress but with a
 * single SRSEntry (no reading/meaning split) - a grammar quiz has exactly one
 * quiz type, the fill-in-the-blank translation exercise.
 */
export interface GrammarProgress {
    grammarId: string;
    stage: 'learning' | 'graduated';
    introductionAt: Date | null;
    nextReviewAt: Date | null;
    lastReviewedAt: Date | null;
    totalReviews: number;
    consecutiveFailures: number;
    entry: SRSEntry;
    /** Immediate-retry flag, mirroring VocabProgress.needsRetry but a single boolean (only one quiz type here). */
    needsRetry?: boolean;
}

export const DEFAULT_GRAMMAR_PROGRESS: GrammarProgress = {
    grammarId: '',
    stage: 'learning',
    introductionAt: null,
    nextReviewAt: null,
    lastReviewedAt: null,
    totalReviews: 0,
    consecutiveFailures: 0,
    entry: { ...DEFAULT_SRS_ENTRY },
};
