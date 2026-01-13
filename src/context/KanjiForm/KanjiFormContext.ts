import {createContext} from "react";

export type KanjiFormState = {
  allKanji: string[]
  kanjiCount: number;
  knownKanji: Set<string>;
  kanjiMethod: 'kklc';
  loading: boolean;
};

export type KanjiFormContextValue = {
  state: KanjiFormState;
  setKanjiCount: (n: number) => void;
  toggleKanji: (k: string) => void;
};

export const KanjiFormContext = createContext<KanjiFormContextValue | null>(null);