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
            /** Minimum interval (initial learning) */
            minIntervalMs: 5 * 60 * 1000, // 5 minutes
            /** Interval after first successful recall (~15 mastery) */
            firstSuccessIntervalMs: 24 * 60 * 60 * 1000, // 1 day
            /** Maximum interval at full mastery */
            maxIntervalMs: 90 * 24 * 60 * 60 * 1000, // 3 months
            /**
             * Curve steepness.
             * >1 = slower start, faster late growth
             * Typical values: 1.5 – 2.5
             */
            growthExponent: 2.0,
            /** Retry delay after failure */
            failureRetryDelayMs: 2 * 60 * 1000,
        },
    },
    storage: {
        progressStorageKey: "GOKAN_SRS_PROGRESS",
        settingsStorageKey: "GOKAN_SRS_SETTINGS",
    },
};
