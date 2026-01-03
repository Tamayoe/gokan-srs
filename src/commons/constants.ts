export const CONSTANTS = {
    setup: {
        defaultKanjiCount: '10',
        minimumKanjiCount: 0,
        maximumKanjiCount: 2300,
    },
    quiz: {
        hiraganaAnswerPlaceholder: "ひらがな",
    },
    srs: {
        queueSize: 5,
        minimumAnswerPoints: 0,
        maximumAnswerPoints: 3,
        correctAnswerPointModification: 1,
        incorrectAnswerPointModidication: -1
    }
} as const;