import type { KanjiKnowledge, UserProgress, UserSettings } from "@gokan-srs/core/models/user.model";

export type SessionState =
    | 'review'        // due reviews exist
    | 'learn'         // can add new words
    | 'learn-kanji'   // no new words, out of kanji, headroom left
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
