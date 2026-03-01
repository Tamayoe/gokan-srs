export interface KKLCIndex {
    [step: number]: string[];
}

export type FrequencyIndex = Array<{
    id: string,
    containedKanji: string[]
}>

export type KKLCKanjiIndex = Record<number, string[]>;