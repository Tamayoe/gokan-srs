import type {KanjiKnowledge, UserProgress, UserSettings} from "./user.model";

export type SessionState =
    | 'review'        // due reviews exist
    | 'learn'         // can add new words
    | 'waiting'       // waiting for next review
    | 'exhausted';    // no vocab left at all

export interface SetupValues {
    kanjiKnowledge: KanjiKnowledge
    settings: UserSettings
}

export interface SetupCompleteValues {
    progress: UserProgress,
    settings: UserSettings
}