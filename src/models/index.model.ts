export interface KKLCIndex {
    [step: number]: string[];
}

export type FrequencyIndex = Array<{
    id: string,
    containedKanji: string[]
}>

export type KKLCKanjiIndex = Record<number, string[]>;

export interface SearchIndexEntry {
    id: string;
    w: string; // kanji
    r: string; // reading
    m: string; // meaning
}

export type SearchIndex = SearchIndexEntry[];