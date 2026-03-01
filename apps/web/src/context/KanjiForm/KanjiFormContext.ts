import {createContext} from "react";
import type {KanjiLearningMethod} from "@gokan-srs/core/models/user.model";

export type KanjiFormState = {
  allKanji: string[]
  kanjiCount: number;
  knownKanji: Set<string>;
  kanjiMethod: KanjiLearningMethod;
  loading: boolean;
};

export type KanjiFormContextValue = {
  state: KanjiFormState;
  setKanjiCount: (n: number) => void;
  toggleKanji: (k: string) => void;
};

export const KanjiFormContext = createContext<KanjiFormContextValue | null>(null);