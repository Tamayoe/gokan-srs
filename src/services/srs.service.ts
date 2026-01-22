// src/services/srs.service.ts
import type { ReviewLog, SRSEntry, VocabProgress } from '../models/vocabulary.model';
import { CONSTANTS } from '../commons/constants';
import { VocabularyService } from './vocabulary.service';
import type { KanjiKnowledge, UserProgress, UserSettings } from '../models/user.model';
import { DEFAULT_VOCABULARY_PROGRESS } from "../models/vocabulary.model";

export type AnswerResult = 'correct' | 'minor_error' | 'wrong' | 'pass';

const F = CONSTANTS.srs.formula;

export class SRSService {

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

    /* =======================
       ANSWER APPLICATION
       ======================= */

    static applyAnswer(
        vocab: VocabProgress,
        userAnswer: string,
        correctAnswer: string, // The specific reading matched (or primary if wrong)
        latencyMs: number,
        now: Date,
        forcedResult?: AnswerResult // Optional override if already calculated
    ): { updated: VocabProgress; result: AnswerResult, interval: number } {
        const result = forcedResult ?? this.analyzeError(userAnswer, correctAnswer);

        // We focus on READING for now
        const currentEntry = { ...vocab.reading };

        const { newEntry, interval } = this.calculateNextState(currentEntry, result, latencyMs, now);

        return {
            updated: {
                ...vocab,
                reading: newEntry,
                // Sync top-level fields
                nextReviewAt: newEntry.dueDate,
                lastReviewedAt: now,
                totalReviews: vocab.totalReviews + 1,
                consecutiveFailures: result === 'correct' ? 0 : vocab.consecutiveFailures + 1,
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
        now: Date
    ): { newEntry: SRSEntry; interval: number } {

        // 1. Calculate Multipliers
        // Latency Multiplier L = clamp(1500 / latency, 0.5, 1.5)
        const latencyRatio = F.expectedLatency / latencyMs;
        const L = Math.min(Math.max(latencyRatio, F.latency.min), F.latency.max);

        // Difficulty Multiplier D = 0.6 + 0.8 * difficulty
        const D = F.difficulty.base + F.difficulty.slope * entry.difficulty;

        // Result Factor
        const resultFactor = F.resultFactors[result];

        // 2. Calculate Gain (Delta)
        const delta = resultFactor * L * D;

        // 3. Update Memory Strength
        // S_new = max(S_min, S_old * (1 + Delta)) -- BUT only strictly enforce floor on failure recovery
        const rawNewStrength = entry.memoryStrength * (1 + delta);
        let newStrength = rawNewStrength;

        if (result === 'wrong') {
            // Recovery floor
            newStrength = Math.max(F.minMemoryStrength, rawNewStrength);
        }

        // 4. Calculate Interval
        // t = S * 0.28768
        let newInterval = newStrength * F.lnTarget;

        // 5. Apply Post-processing Overrides
        if (result === 'wrong') {
            // Logic adjusted to match test dataset (Case 6 vs Case 4 consistency)
            // The dataset implies straight multiplication by 0.3, then global clamping.
            newInterval = newInterval * F.postProcessIntervalMultipliers.wrong;
        } else if (result === 'minor_error') {
            newInterval = newInterval * F.postProcessIntervalMultipliers.minor_error;
        }

        // 6. Clamp Interval
        newInterval = Math.min(Math.max(newInterval, F.minInterval), F.maxInterval);

        // 7. Update Difficulty (Auto-adjustment)
        // optional but recommended in spec
        let newDifficulty = entry.difficulty;
        if (result === 'wrong') {
            newDifficulty -= 0.02;
        } else if (result === 'correct' && latencyMs < F.expectedLatency) {
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

    static async refillQueue(
        currentQueue: VocabProgress[],
        kanjiKnowledge: KanjiKnowledge,
        settings: UserSettings,
        maxToAdd: number
    ): Promise<VocabProgress[]> {
        if (maxToAdd <= 0) return currentQueue;

        const queue = [...currentQueue];
        const activeIds = new Set(queue.map(v => v.vocabId));

        switch (settings.preferredLearningOrder) {
            case "kklc":
                if (kanjiKnowledge.method !== "kklc") {
                    throw new Error(
                        "Cannot use KKLC vocabulary without KKLC kanji knowledge"
                    );
                }

                return this.fillQueueWithKKLC(
                    queue,
                    activeIds,
                    kanjiKnowledge.step,
                    maxToAdd
                );

            case "frequency":
                return this.fillQueueWithFrequency(
                    queue,
                    activeIds,
                    kanjiKnowledge,
                    maxToAdd
                );
        }
    }

    /* =======================
       INTERNAL FILLERS
       ======================= */

    private static async fillQueueWithKKLC(
        queue: VocabProgress[],
        activeIds: Set<string>,
        kklcKanjiStep: number,
        maxToAdd: number
    ): Promise<VocabProgress[]> {
        const index = await VocabularyService.loadKKLCIndex();
        if (!index) return queue;

        let added = 0;

        for (let step = 1; step <= kklcKanjiStep; step++) {
            const ids = index[step] ?? [];

            for (const id of ids) {
                if (added >= maxToAdd) return queue;
                if (activeIds.has(id)) continue;

                queue.push(this.createNewVocabProgress(id));
                activeIds.add(id);
                added++;
            }
        }

        return queue;
    }

    private static async fillQueueWithFrequency(
        queue: VocabProgress[],
        activeIds: Set<string>,
        kanjiKnowledge: KanjiKnowledge,
        maxToAdd: number
    ): Promise<VocabProgress[]> {
        const index = await VocabularyService.loadFrequencyIndex();
        if (!index) return queue;

        let added = 0;

        for (const entry of index) {
            if (added >= maxToAdd) break;
            if (activeIds.has(entry.id)) continue;

            const allKanjiKnown = entry.containedKanji.every(k =>
                kanjiKnowledge.kanjiSet.has(k)
            );

            if (!allKanjiKnown) continue;

            queue.push(this.createNewVocabProgress(entry.id));
            activeIds.add(entry.id);
            added++;
        }

        return queue;
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
            updated.nextReviewAt = null;
            updated.stage = 'graduated';
            // Set max interval/strength?
            // For now, graduated means stopped scheduling.
        } else {
            // CHOICE LEARNING:
            // Set initial due date to NOW
            updated.nextReviewAt = new Date();
        }

        return updated;
    }

    private static createNewVocabProgress(vocabId: string): VocabProgress {
        return {
            ...DEFAULT_VOCABULARY_PROGRESS,
            vocabId
        };
    }
}
