// src/services/srs.service.ts
import type { ReviewLog, SRSEntry, VocabProgress } from '../models/vocabulary.model';
import { CONSTANTS } from '../commons/constants';
import { VocabularyService } from './vocabulary.service';
import type { KanjiKnowledge, UserProgress, UserSettings } from '../models/user.model';


export type AnswerResult = 'correct' | 'minor_error' | 'wrong' | 'pass';

const F = CONSTANTS.srs.formula;

export class SRSService {

    /* =======================
       CONSTANTS & THRESHOLDS
       ======================= */

    private static readonly MAX_MEMORY_STRENGTH = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

    /* =======================
       ANSWER EVALUATION
       ======================= */

    /**
     * Checks user input against ALL acceptable readings.
     * Returns the best result found (Correct > Minor Error > Wrong).
     */
    static evaluateAnswer(
        userInput: string,
        readings: { primary: string; alternatives: string[] }
    ): { result: AnswerResult; matchedAnswer: string } {
        const allReadings = [readings.primary, ...readings.alternatives];
        let bestResult: AnswerResult = 'wrong';
        let bestMatch = readings.primary;

        for (const reading of allReadings) {
            const res = this.analyzeError(userInput, reading);

            if (res === 'pass') {
                return { result: 'pass', matchedAnswer: bestMatch };
            }

            if (res === 'correct') {
                return { result: 'correct', matchedAnswer: reading };
            }

            if (res === 'minor_error') {
                bestResult = 'minor_error';
                bestMatch = reading;
            }
        }

        return { result: bestResult, matchedAnswer: bestMatch };
    }

    /**
     * Checks user input against ALL acceptable meanings (glosses).
     * Returns the best result found.
     */
    static evaluateMeaning(
        userInput: string,
        meanings: string[]
    ): { result: AnswerResult; matchedAnswer: string } {
        let bestResult: AnswerResult = 'wrong';
        let bestMatch = meanings[0] || '';

        // Pre-normalize user input once for efficiency
        const normalizedUser = this.normalizeMeaning(userInput);

        if (normalizedUser === 'pass' || normalizedUser === '') {
            return { result: normalizedUser === 'pass' ? 'pass' : 'wrong', matchedAnswer: bestMatch };
        }

        for (const meaning of meanings) {
            // [FIX] pre-strip parentheses so that commas inside them (e.g. "go (to, from)") don't break splitting
            const cleanMeaning = meaning.replace(/\s*\(.*?\)\s*/g, " ");

            // Split meaning by separators (comma, semicolon)
            // e.g. "answer; reply; solution"
            const parts = cleanMeaning.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);

            for (const part of parts) {
                const normalizedExpected = this.normalizeMeaning(part);
                const res = this.compareMeaning(normalizedUser, normalizedExpected);

                if (res === 'correct') {
                    return { result: 'correct', matchedAnswer: part };
                }

                if (res === 'minor_error' && bestResult !== 'minor_error') {
                    bestResult = 'minor_error';
                    bestMatch = part;
                }
            }
        }

        return { result: bestResult, matchedAnswer: bestMatch };
    }

    private static normalizeMeaning(text: string): string {
        // 1. Lowercase
        let s = text.toLowerCase().trim();

        // 2a. Remove content within parentheses (e.g. "to go (to a place)")
        // This must be done BEFORE removing punctuation so we can identify the parentheses
        s = s.replace(/\s*\(.*?\)\s*/g, " ");

        // 3. Remove punctuation
        s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

        // 4. Remove stop words from START of string
        // "to eat" -> "eat"
        // "a cat" -> "cat"
        // "to be seen" -> "seen"
        s = s.replace(/^(to\s+be|to|be|a|an|the)\s+/g, "");

        // 4. Collapse spaces
        s = s.replace(/\s+/g, " ");

        return s.trim();
    }

    private static compareMeaning(user: string, expected: string): AnswerResult {
        if (user === expected) return 'correct';

        // Fuzzy check
        const dist = this.levenshtein(user, expected);

        // Allow distance 1 for short words (len>=3), distance 2 for long (len>=6)
        // But strict for very short words (len < 3)
        let allowed = 0;
        if (expected.length >= 6) allowed = 2;
        else if (expected.length >= 3) allowed = 1;

        if (dist <= allowed) return 'minor_error';

        return 'wrong';
    }



    /* =======================
       ANSWER APPLICATION
       ======================= */

    static applyAnswer(
        vocab: VocabProgress,
        quizType: 'reading' | 'meaning',
        quizMode: 'base' | 'context' | undefined, // [NEW] Mode
        userAnswer: string,
        correctAnswer: string, // The specific reading/meaning matched
        latencyMs: number,
        now: Date,
        forcedResult?: AnswerResult, // Optional override
        intervalModifier: number = 1.0, // Adaptive modifier
        frequencyModifier: number = 1.0 // User preference modifier
    ): { updated: VocabProgress; result: AnswerResult, interval: number } {
        const result = forcedResult ?? this.analyzeError(userAnswer, correctAnswer);

        // [NEW] Retry Logic:
        // If this exact quiz type is in retry mode, separate handling?
        // Actually, needsRetry is currently a boolean on the whole vocab.
        // We should PROBABLY treat needsRetry as specific to the quiz type eventually,
        // but for now, if 'needsRetry' is true, we assume it applies to the active question.
        // *Correction*: The user wants successive batches. If I fail Reading, I retry Reading.
        // If I fail Meaning, I retry Meaning.
        // The current model has a single `needsRetry` flag.
        // Decision: Let's assume `needsRetry` applies to the CURRENT quiz type being presented.
        // (A safer refactor later would be `needsRetry: { reading: boolean, meaning: boolean }`)
        // For Phase 1, we keep single flag but check it.

        if (vocab.needsRetry) {
            const isSuccess = result === 'correct' || result === 'minor_error';
            return {
                updated: {
                    ...vocab,
                    needsRetry: !isSuccess // Clear if success, otherwise keep true
                },
                result,
                interval: quizType === 'reading' ? vocab.reading.interval : vocab.meaning.interval
            };
        }

        // Select the correct entry to update
        const currentEntry = quizType === 'reading' ? { ...vocab.reading } : { ...vocab.meaning };

        // [NEW] Dynamically determine latency limit based on mode and type
        let expectedLatencyKey: keyof typeof CONSTANTS.srs.quizProperties = quizType === 'reading' ? 'reading' : 'meaning_base';
        if (quizType === 'meaning' && quizMode === 'context') {
            expectedLatencyKey = 'meaning_context';
        }
        const expectedLatency = CONSTANTS.srs.quizProperties[expectedLatencyKey].expectedLatency;

        const { newEntry, interval } = this.calculateNextState(currentEntry, result, latencyMs, now, expectedLatency, intervalModifier, frequencyModifier);

        // Check for Graduation (Mastery)
        // A word is graduated if BOTH are mastered? Or if the specific one is mastered?
        // The design says: "Remains 'learning' until BOTH...".
        // Actually, let's keep it simple: If memoryStrength >= MAX => 'graduated' logic per entry?
        // No, 'stage' is top-level.
        // Let's use the aggregation logic decided:
        // isMastered = reading.memory >= MAX && meaning.memory >= MAX

        // We update the specific entry first
        const updatedReading = quizType === 'reading' ? newEntry : vocab.reading;
        const updatedMeaning = quizType === 'meaning' ? newEntry : vocab.meaning;

        // [BUGFIX] Stagger Meaning quizzes: if we just successfully answered a Reading quiz,
        // and Meaning is currently due (or about to be due), push Meaning forward by 12 hours
        // so that the user doesn't get tested on both in the exact same session.
        if (quizType === 'reading' && (result === 'correct' || result === 'minor_error')) {
            if (updatedMeaning.dueDate !== null && updatedMeaning.dueDate <= now) {
                updatedMeaning.dueDate = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12 hours
            }
        }

        const isReadingMastered = updatedReading.memoryStrength >= SRSService.MAX_MEMORY_STRENGTH;
        const isMeaningMastered = updatedMeaning.memoryStrength >= SRSService.MAX_MEMORY_STRENGTH;

        let finalStage = vocab.stage;
        let finalNextReviewAt: Date | null = null;

        if (isReadingMastered && isMeaningMastered) {
            finalStage = 'graduated';
            finalNextReviewAt = null; // Done forever
        } else {
            // Aggregation: min(reading.due, meaning.due)
            // Be careful: if one is mastered (due=null), use the other.
            // If both null? (Shouldn't happen if not graduated, unless new)

            const rDue = isReadingMastered ? null : updatedReading.dueDate;
            const mDue = isMeaningMastered ? null : updatedMeaning.dueDate;

            if (rDue && mDue) {
                finalNextReviewAt = rDue < mDue ? rDue : mDue;
            } else {
                finalNextReviewAt = rDue ?? mDue;
            }
        }

        // Set retry flag only on first wrong answer AND only for Reading quizzes
        // Meaning quizzes do not trigger retries for now
        const needsRetry = result === 'wrong' && !vocab.needsRetry && quizType === 'reading';

        return {
            updated: {
                ...vocab,
                reading: updatedReading,
                meaning: updatedMeaning,
                // Sync top-level fields
                stage: finalStage,
                nextReviewAt: finalNextReviewAt,
                lastReviewedAt: now,
                totalReviews: vocab.totalReviews + 1,
                consecutiveFailures: result === 'correct' ? 0 : vocab.consecutiveFailures + 1, // Keep legacy or tracking?
                needsRetry,
            },
            result,
            interval
        };
    }

    /* =======================
       CORE ALGORITHM (FORMULA)
       ======================= */

    private static calculateNextState(
        entry: SRSEntry,
        result: AnswerResult,
        latencyMs: number,
        now: Date,
        expectedLatency: number, // [NEW] dynamic expected latency parameter
        intervalModifier: number = 1.0,
        frequencyModifier: number = 1.0
    ): { newEntry: SRSEntry; interval: number } {

        // 1. Calculate Multipliers
        // Latency Multiplier L = clamp(expectedLatency / latency, 0.5, 1.5)
        const latencyRatio = expectedLatency / latencyMs;
        const L = Math.min(Math.max(latencyRatio, F.latency.min), F.latency.max);

        // Difficulty Multiplier D = 0.6 + 0.8 * difficulty
        const D = F.difficulty.base + F.difficulty.slope * entry.difficulty;

        // Result Factor
        const resultFactor = F.resultFactors[result];

        // 2. Calculate Gain (Delta)
        const delta = resultFactor * L * D;

        // 3. Update Memory Strength
        // S_new = max(S_min, S_old * (1 + Delta)) -- BUT only strictly enforce floor on failure recovery
        // Enforce safety floor to prevent infinite 0-multiplier loops (e.g. from data corruption or old mastery=0 migrations)
        const rawNewStrength = entry.memoryStrength * (1 + delta);
        const newStrength = Math.max(F.minMemoryStrength, rawNewStrength);

        // 4. Calculate Interval
        // t = S * 0.28768 * intervalModifier (Adaptive Scaling)
        // We apply the modifier to the INTERVAL, not the memory strength.
        // This effectively demands higher memory strength for the same interval if modifier > 1?
        // No, modifier > 1 means LONGER interval for same strength?
        // Wait, if user is too good, we want HARDER.
        // Harder = Longer Interval? Yes, push them further.
        // So modifier > 1.0 is correct for "Hard Mode".
        // t = S * C * Mod
        let newInterval = newStrength * F.lnTarget * intervalModifier * frequencyModifier;

        // 5. Apply Post-processing Overrides
        if (result === 'wrong') {
            // Logic adjusted to match test dataset (Case 6 vs Case 4 consistency)
            // The dataset implies straight multiplication by 0.3, then global clamping.
            // BUT strict spec requires hard floor for wrong answers:
            // "interval = Math.max(0.5, interval * 0.3);"
            newInterval = Math.max(
                F.minIntervalAfterWrong,
                newInterval * F.postProcessIntervalMultipliers.wrong
            );
        } else if (result === 'minor_error') {
            newInterval = newInterval * F.postProcessIntervalMultipliers.minor_error;
        }

        // Strategy A: If successful, ensure at least 1 day interval (no same-day harassment)
        if (result === 'correct' || result === 'minor_error') {
            newInterval = Math.max(newInterval, F.minIntervalAfterSuccess);
        }

        // 6. Clamp Interval
        newInterval = Math.min(Math.max(newInterval, F.minInterval), F.maxInterval);

        // 7. Update Difficulty (Auto-adjustment)
        // optional but recommended in spec
        let newDifficulty = entry.difficulty;
        if (result === 'wrong') {
            newDifficulty -= 0.02;
        } else if (result === 'correct' && latencyMs < expectedLatency) {
            newDifficulty += 0.01;
        }
        newDifficulty = Math.min(Math.max(newDifficulty, 0), 1); // Clamp 0-1

        // 8. Due Date
        const dueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

        // History Log
        const historyLog: ReviewLog = {
            date: now.getTime(),
            result,
            interval: newInterval,
            latency: latencyMs
        };

        return {
            newEntry: {
                ...entry,
                memoryStrength: newStrength,
                interval: newInterval,
                difficulty: newDifficulty,
                lastReviewedAt: now,
                dueDate: dueDate,
                history: [...entry.history, historyLog].slice(-20)
            },
            interval: newInterval
        };
    }

    static analyzeError(user: string, expected: string): AnswerResult {
        const u = user.trim().replace(/\s+/g, '');
        const e = expected.trim().replace(/\s+/g, '');

        if (u === e) return 'correct';
        if (u === 'pass') return 'pass';

        // Minor error check
        // Rule: Levenshtein distance <= 1 AND length relative check
        // User Examples:
        // こたへ (subs) -> minor
        // こたぇ (subs) -> minor
        // こたええ (insert) -> minor
        // こーたえ (insert) -> minor
        // こえ (delete) -> wrong

        // This implies we allow substitutions and insertions (user >= expected), but NOT deletions (user < expected).
        // Or strictly: mora count check. For now, char length is a sufficient proxy for these examples.

        const dist = this.levenshtein(u, e);

        // Allow distance 1 IF it's not a pure deletion that shortens the word effectively below target
        // The user example 'こえ' (2 chars) vs 'こたえ' (3 chars) is WRONG.
        // 'こーたえ' (4 chars) vs 'こたえ' (3 chars) is MINOR.
        // So: dist <= 1 AND u.length >= e.length

        if (dist <= 1 && u.length >= e.length) {
            return 'minor_error';
        }

        return 'wrong';
    }



    /**
     * Standard Levenshtein Distance
     */
    private static levenshtein(a: string, b: string): number {
        const matrix = [];

        // 1. Initialize matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // 2. Fill matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }


    /* =======================
       VOCAB AVAILABILITY
       ======================= */

    static async hasMoreLearnableVocabulary(
        progress: UserProgress,
        settings: UserSettings
    ): Promise<boolean> {
        const count = await this.countLearnableVocabulary(
            progress,
            settings,
            1
        );

        return count > 0;
    }

    static async countLearnableVocabulary(
        progress: UserProgress,
        settings: UserSettings,
        limit = Infinity
    ): Promise<number> {
        let count = 0;

        switch (settings.preferredLearningOrder) {
            case 'kklc': {
                if (progress.kanjiKnowledge.method !== 'kklc') return 0;

                const index = await VocabularyService.loadKKLCIndex();
                if (!index) return 0;

                for (let step = 1; step <= progress.kanjiKnowledge.step; step++) {
                    const ids = index[step] ?? [];
                    for (const id of ids) {
                        if (!progress.learningQueue.find(vocab => vocab.vocabId === id)) {
                            count++;
                            if (count >= limit) return count;
                        }
                    }
                }
                break;
            }

            case 'kanji_coverage':
            case 'frequency': {
                const index = await VocabularyService.loadFrequencyIndex();
                if (!index) return 0;

                for (const entry of index) {
                    if (progress.learningQueue.find(vocab => vocab.vocabId === entry.id)) continue;

                    const allKanjiKnown = entry.containedKanji.every(k =>
                        progress.kanjiKnowledge.kanjiSet.has(k)
                    );

                    if (!allKanjiKnown) continue;

                    count++;
                    if (count >= limit) return count;
                }
                break;
            }
        }

        return count;
    }

    /* =======================
       QUEUE REFILL
       ======================= */


    /**
     * Finds the next batch of vocabulary IDs eligible for learning.
     * Does NOT create VocabProgress objects or modify the queue.
     */
    static async getNextCandidates(
        currentQueue: VocabProgress[],
        kanjiKnowledge: KanjiKnowledge,
        settings: UserSettings,
        maxToFind: number,
        ignoredIds: Set<string> = new Set()
    ): Promise<string[]> {
        if (maxToFind <= 0) return [];

        const activeIds = new Set(currentQueue.map(v => v.vocabId));
        // Also exclude ignoredIds
        for (const id of ignoredIds) activeIds.add(id);

        switch (settings.preferredLearningOrder) {
            case "kklc":
                if (kanjiKnowledge.method !== "kklc") {
                    throw new Error(
                        "Cannot use KKLC vocabulary without KKLC kanji knowledge"
                    );
                }
                return this.findCandidatesKKLC(activeIds, kanjiKnowledge.step, maxToFind);

            case "kanji_coverage":
                return this.findCandidatesKanjiCoverage(activeIds, kanjiKnowledge, maxToFind, settings.kanjiCoverageTarget || 1);

            case "frequency":
                return this.findCandidatesFrequency(activeIds, kanjiKnowledge, maxToFind);
        }
    }

    /**
     * Creates a new VocabProgress object for a given vocab ID.
     * Use this when the user explicitly accepts a new vocabulary item.
     *
     * @param vocabId ID of the vocabulary to learn
     * @param difficultyOffset Optional difficulty adjustment based on user performance
     */
    static createVocabProgress(vocabId: string, difficultyOffset = 0): VocabProgress {
        // Strategy D + Dynamic: InitialDifficulty (0.5) + Offset
        const baseDiff = CONSTANTS.srs.formula.initialDifficulty;
        const finalDiff = Math.min(Math.max(baseDiff + difficultyOffset, 0.1), 1.0);

        return {
            vocabId,
            stage: 'learning',
            introductionAt: null,
            nextReviewAt: null,
            lastReviewedAt: null,
            totalReviews: 0,
            consecutiveFailures: 0,
            reading: {
                memoryStrength: CONSTANTS.srs.formula.minMemoryStrength,
                interval: 0,
                difficulty: finalDiff,
                lastReviewedAt: null,
                dueDate: null,
                history: []
            },
            meaning: {
                memoryStrength: CONSTANTS.srs.formula.minMemoryStrength,
                interval: 0,
                difficulty: finalDiff,
                lastReviewedAt: null,
                dueDate: null,
                history: []
            }
        };
    }

    /* =======================
       INTERNAL FILLERS
       ======================= */

    private static async findCandidatesKKLC(
        activeIds: Set<string>,
        kklcKanjiStep: number,
        maxToFind: number
    ): Promise<string[]> {
        const index = await VocabularyService.loadKKLCIndex();
        if (!index) return [];

        const candidates: string[] = [];

        for (let step = 1; step <= kklcKanjiStep; step++) {
            const ids = index[step] ?? [];

            for (const id of ids) {
                if (candidates.length >= maxToFind) return candidates;
                if (!activeIds.has(id)) {
                    candidates.push(id);
                }
            }
        }
        return candidates;
    }

    private static async findCandidatesFrequency(
        activeIds: Set<string>,
        kanjiKnowledge: KanjiKnowledge,
        maxToFind: number
    ): Promise<string[]> {
        const index = await VocabularyService.loadFrequencyIndex();
        if (!index) return [];

        const candidates: string[] = [];

        for (const entry of index) {
            if (candidates.length >= maxToFind) break;
            if (activeIds.has(entry.id)) continue;

            const allKanjiKnown = entry.containedKanji.every(k =>
                kanjiKnowledge.kanjiSet.has(k)
            );

            if (allKanjiKnown) {
                candidates.push(entry.id);
            }
        }

        return candidates;
    }

    private static async findCandidatesKanjiCoverage(
        activeIds: Set<string>,
        kanjiKnowledge: KanjiKnowledge,
        maxToFind: number,
        targetCoverage: number
    ): Promise<string[]> {
        const index = await VocabularyService.loadFrequencyIndex();
        if (!index) return [];

        const candidates: string[] = [];

        // 1. Calculate how many times each kanji is covered in the active vocabulary
        const coveredKanjiCount = new Map<string, number>();
        for (const k of kanjiKnowledge.kanjiSet) {
            coveredKanjiCount.set(k, 0);
        }

        // We need a fast lookup for kanji by vocab ID
        const idToKanji = new Map<string, string[]>();
        for (const entry of index) {
            idToKanji.set(entry.id, entry.containedKanji);
        }

        for (const id of activeIds) {
            const kanjis = idToKanji.get(id) || [];
            for (const k of kanjis) {
                if (coveredKanjiCount.has(k)) {
                    coveredKanjiCount.set(k, coveredKanjiCount.get(k)! + 1);
                }
            }
        }

        // 2. Identify kanji that haven't met the target coverage yet
        const uncoveredKanji = new Set<string>();
        for (const [k, count] of coveredKanjiCount.entries()) {
            if (count < targetCoverage) {
                uncoveredKanji.add(k);
            }
        }

        // 3. Pre-filter words that are learnable and not already active
        const learnableUnusedWords = [];
        for (let rank = 0; rank < index.length; rank++) {
            const entry = index[rank];
            if (activeIds.has(entry.id)) continue;

            const allKanjiKnown = entry.containedKanji.every((k) => kanjiKnowledge.kanjiSet.has(k));
            if (allKanjiKnown) {
                learnableUnusedWords.push({ entry, rank });
            }
        }

        const KANJI_COVERAGE_RANK_VALUE = 2500;

        // 4. Find words that maximize a blended score of kanji coverage vs frequency penalty
        while (candidates.length < maxToFind && uncoveredKanji.size > 0) {
            let bestEntry = null;
            let maxScore = -Infinity;

            for (const { entry, rank } of learnableUnusedWords) {
                if (candidates.includes(entry.id)) continue;

                let coverage = 0;
                for (const k of entry.containedKanji) {
                    if (uncoveredKanji.has(k)) coverage++;
                }

                if (coverage > 0) {
                    const score = coverage * KANJI_COVERAGE_RANK_VALUE - rank;
                    if (score > maxScore) {
                        maxScore = score;
                        bestEntry = entry;
                    }
                }
            }

            if (!bestEntry) break;

            candidates.push(bestEntry.id);
            // Re-evaluate coverage for the remaining capacity
            for (const k of bestEntry.containedKanji) {
                if (uncoveredKanji.has(k)) {
                    const newCount = (coveredKanjiCount.get(k) || 0) + 1;
                    coveredKanjiCount.set(k, newCount);
                    if (newCount >= targetCoverage) {
                        uncoveredKanji.delete(k);
                    }
                }
            }
        }

        // 5. Fallback: Filling remaining slots by pure frequency
        if (candidates.length < maxToFind) {
            for (const { entry } of learnableUnusedWords) {
                if (candidates.length >= maxToFind) break;
                if (!candidates.includes(entry.id)) {
                    candidates.push(entry.id);
                }
            }
        }

        return candidates;
    }

    /* =======================
       HELPERS
       ======================= */

    static applyVocabIntroChoice(
        progress: VocabProgress,
        choice: 'learn' | 'skip'
    ): VocabProgress {
        const updated: VocabProgress = {
            ...progress,
            introductionAt: new Date(),
        };

        if (choice === 'skip') {
            // User feedback: Skip means "Fully Mastered"
            const maxS = CONSTANTS.srs.formula.mastery.maxMemoryStrength;
            const maxIntervalDays = CONSTANTS.srs.formula.maxInterval;

            updated.reading.memoryStrength = maxS;
            updated.reading.interval = maxIntervalDays;
            updated.reading.dueDate = null; // No review scheduled (effectively)
            updated.reading.lastReviewedAt = new Date();

            updated.meaning.memoryStrength = maxS;
            updated.meaning.interval = maxIntervalDays;
            updated.meaning.dueDate = null; // [BUGFIX] Ensure it is cleared so chart ignores it

            updated.nextReviewAt = null; // No review calculation needed
            updated.stage = 'graduated';
        } else {
            // CHOICE LEARNING:
            // Set initial due date to NOW for reading.
            // Stagger meaning by 12 hours so it isn't asked immediately after reading in the same session.
            const now = new Date();
            updated.nextReviewAt = now;
            updated.reading.dueDate = now;
            updated.meaning.dueDate = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        }

        return updated;
    }

    /**
     * Calculates user's recent win rate from the queue.
     * Uses the last 20 reviews of each item in the queue.
     */
    static calculateRecentWinRate(queue: VocabProgress[]): number {
        let totalReviews = 0;
        let successfulReviews = 0;

        for (const vocab of queue) {
            // Helper to count history
            const processHistory = (history: ReviewLog[]) => {
                for (const log of history) {
                    totalReviews++;
                    if (log.result === 'correct' || log.result === 'minor_error') {
                        successfulReviews++;
                    }
                }
            };

            processHistory(vocab.reading.history);
            // processHistory(vocab.meaning.history); // Uncomment if we track meaning
        }

        if (totalReviews === 0) return 0.75; // Default assumption

        return successfulReviews / totalReviews;
    }

    /* =======================
       ADAPTIVE SRS LOGIC
       ======================= */

    /**
     * Updates the user's global difficulty level based on review performance.
     * Should be called after every review.
     */
    static updateAdaptiveStats(
        currentStats: { level: number; history: boolean[] },
        result: AnswerResult
    ): { level: number; history: boolean[] } {
        const { historySize, increaseThreshold, decreaseThreshold, levelStep, minLevel, maxLevel } = CONSTANTS.srs.adaptive;

        // 1. Update History
        const isSuccess = result === 'correct' || result === 'minor_error';
        const newHistory = [...currentStats.history, isSuccess].slice(-historySize);

        // 2. Calculate Rolling Win Rate
        // Only calculate if we have enough history to be statistically meaningful?
        // Let's start adapting immediately but maybe damp it?
        // For now, simple average of what we have.
        const successCount = newHistory.filter(Boolean).length;
        const winRate = successCount / newHistory.length;

        // 3. Adjust Level
        let newLevel = currentStats.level;

        // Only adjust if history is at least 10 items to prevent wild swings at start
        if (newHistory.length >= 10) {
            if (winRate > increaseThreshold) {
                // Too easy -> Increase difficulty (Multiplier UP)
                newLevel = Math.min(newLevel + levelStep, maxLevel);
            } else if (winRate < decreaseThreshold) {
                // Too hard -> Decrease difficulty (Multiplier DOWN)
                newLevel = Math.max(newLevel - levelStep, minLevel);
            }
        }

        return {
            level: Number(newLevel.toFixed(2)), // Clean float
            history: newHistory
        };
    }

}
