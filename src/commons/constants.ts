export const CONSTANTS = {
    setup: {
        defaultKanjiCount: '10',
        minimumKanjiCount: 0,
        maximumKanjiCount: 2300,
    },
    quiz: {
        hiraganaAnswerPlaceholder: "ひらがな",
        correctAnswerAutoAdvanceDelay: 1800,
        incorrectAnswerRevealDelay: 400,
    },
    srs: {
        queueSize: 5,
        minimumAnswerPoints: 0,
        maximumAnswerPoints: 1,
        correctAnswerPointModification: 1,
        incorrectAnswerPointModification: -1
    },
    storage: {
        progressStorageKey: 'GOKAN_SRS_PROGRESS',
        settingsStorageKey: 'GOKAN_SRS_SETTINGS'
    }
} as const;