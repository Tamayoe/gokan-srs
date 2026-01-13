export const CONSTANTS = {
    setup: {
        defaultKanjiCount: "10",
        defaultKanjiLearningMethod: 'kklc',
        minimumKanjiCount: 0,
        maximumKanjiCount: 2300,
    },

    quiz: {
        hiraganaAnswerPlaceholder: "ひらがな",
        correctAnswerAutoAdvanceDelay: 1800,
        incorrectAnswerRevealDelay: 400,
    },

    srs: {
        /** Maximum number of new vocab introduced per day */
        dailyNewLimit: 20,
        newVocabBatchSize: 1,

        /** Mastery system */
        mastery: {
            min: 0,
            max: 100,

            /** Mastery gained on a correct answer */
            successGain: 15,

            /** Mastery lost on an incorrect answer */
            failurePenalty: 20,
        },

        /** Scheduling (time between reviews) */
        scheduling: {
            /** Base interval in milliseconds (e.g. 5 minutes) */
            baseIntervalMs: 5 * 60 * 1000,

            /**
             * Exponential growth factor applied as mastery increases.
             * mastery = 100 → longest intervals
             */
            intervalMultiplier: 6,

            /** Retry delay after a failure (e.g. 2 minutes) */
            failureRetryDelayMs: 2 * 60 * 1000,
        },
    },

    storage: {
        progressStorageKey: "GOKAN_SRS_PROGRESS",
        settingsStorageKey: "GOKAN_SRS_SETTINGS",
    },
} as const;
