// Shared contract with gokan-srs's `src/models/index.model.ts` (see CLAUDE.md -> Project
// Structure -> the 5 shared model files are intentionally duplicated across both apps).
// Trimmed to the indexes this app actually reads: the reverse kanji->vocab index (kanji
// detail pages) and the compact search index (client-side search). The learning-order
// indexes (kklc.json, frequency.json, jlpt.json + their types) drive gokan-srs's SRS queue
// selection, which this app has no equivalent of.

export type KanjiVocabIndex = Record<string, string[]>;

export interface SearchIndexEntry {
    id: string;
    w: string; // kanji
    r: string; // reading
    m: string; // meaning
}

export type SearchIndex = SearchIndexEntry[];

/** index/jlpt.json: JLPT level (as a string key) -> that level's vocab, frequency-ordered. */
export interface JlptIndexEntry {
    id: string;
    containedKanji: string[];
}

export type VocabJlptIndex = Record<string, JlptIndexEntry[]>;
