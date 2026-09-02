// Grammar models, mirroring apps/gokan-srs/src/models/grammar.model.ts (see the note in
// Project Structure about this app carrying its own copy of the shared model files).
//
// Deliberately a SUBSET of gokan-srs's version: only the fields the dictionary's static pages
// actually render are declared here. The SRS-side progress types (GrammarProgress) and the
// browse/teaching-order/variant index shapes have no meaning on a public reference page, so
// copying them would only create surface area to drift.

export interface GrammarExampleWord {
    surface: string;
    vocabId: string | null;
    reading?: string;
    baseForm?: string;
}

export interface GrammarExample {
    jp: string;
    romaji: string;
    en: string;
    words: GrammarExampleWord[];
    patternWordIndices: number[];
}

export interface GrammarPoint {
    id: string;
    /** Japanese/pattern portion only, e.g. "～けど、～". */
    title: string;
    /** Transliteration split off `title` at build time; absent for a small residue of points. */
    romaji?: string;
    /** 1 (N1, hardest) .. 5 (N5, easiest). Every grammar point has one. */
    jlptLevel: number;
    shortExplanation: string;
    longExplanation: string;
    formation: string;
    kind?: 'construction' | 'inflection' | 'lexical';
    examples: GrammarExample[];
    formalityLevel?: 'casual' | 'neutral' | 'polite' | 'formal' | 'very-formal-literary';
    usageNote?: string;
    family?: {
        id: string;
        name: string;
        /** Ids of the OTHER points in this family (excludes this point's own id). */
        relatedPoints: string[];
    };
}

/** grammar/index/jlpt.json: JLPT level (as a string key) -> ordered grammar point ids. */
export type GrammarJlptIndex = Record<string, string[]>;
