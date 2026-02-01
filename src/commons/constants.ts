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
        newVocabBatchSize: 3,

        /** Maximum number of reviews per day */
        maxReviewsPerDay: 150,

        /** Formula Constants */
        formula: {
            targetRecall: 0.75,
            lnTarget: 0.28768,
            expectedLatency: 10000, // ms (10s for typing-based answers)
            minInterval: 0.2, // ~5 hours
            maxInterval: 3650, // 10 years
            minMemoryStrength: 1, // days

            // Strategy D: Start with higher confidence
            initialDifficulty: 0.5,

            // Post-processing overrides
            minIntervalAfterWrong: 0.5, // 12 hours minimum penalty for wrong answers
            // Strategy A: Prevent same-day reviews for known items
            minIntervalAfterSuccess: 1.0, // 1 day minimum for correct/minor_error

            // Dynamic Difficulty
            winRateTarget: 0.75, // Target win rate for tuning default difficulty

            resultFactors: {
                correct: 0.25,
                minor_error: 0.10,
                wrong: -0.40,
                pass: -0.15
            },

            // Difficulty = 0.6 + 0.8 * d (d is 0-1, where 1=easy)
            difficulty: {
                base: 0.6,
                slope: 0.8
            },

            // Latency Clamp: [0.5, 1.5]
            latency: {
                min: 0.5,
                max: 1.5
            },

            fuzzFactor: 0.05,

            postProcessIntervalMultipliers: {
                wrong: 0.3,
                minor_error: 0.7
            },

            mastery: {
                // Target memory strength for ~1 year interval (100% mastery visually)
                // t = S * 0.28768  => S = t / 0.28768
                // For 365 days: 365 / 0.28768 ≈ 1269
                maxMemoryStrength: 1270,
                // Soft cap for visual mastery loop 1 (User Mastery)
                // For ~60 days: 60 / 0.28768 ≈ 208
                visualSoftCap: 208
            }
        }
    },

    storage: {
        progressStorageKey: "GOKAN_SRS_PROGRESS",
        settingsStorageKey: "GOKAN_SRS_SETTINGS",
        googleDriveFileName: "kanji-progress.json",
        googleDriveFolderName: "KanjiApp",
        googleDriveTokenKey: "GOKAN_SRS_GOOGLE_TOKEN",
    },
} as const;
