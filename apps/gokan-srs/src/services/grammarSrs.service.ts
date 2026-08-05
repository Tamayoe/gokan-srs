import type { GrammarProgress } from '../models/grammar.model';
import { GRAMMAR_JLPT_LEVELS } from '../models/grammar.model';
import type { AnswerResult } from './srs.service';
import { SRSService } from './srs.service';
import { CONSTANTS } from '../commons/constants';
import { GrammarService } from './grammar.service';
import { isGrammarFullyMastered, grammarNextReviewAt } from './grammarScheduling';

/**
 * Grammar's equivalent of SRSService: reuses the same formula
 * (SRSService.calculateNextState) and evaluation helpers rather than a new
 * algorithm, per issue #17. Simpler than the vocab version throughout since a
 * GrammarProgress has a single SRSEntry and a single quiz type - no
 * reading/meaning batching or AI-context modes to account for.
 *
 * Learning order is always JLPT level (N5 -> N1, source order within a level) -
 * grammar has no frequency data to sort by, unlike vocab, so it doesn't need
 * settings.preferredLearningOrder's variety of orders.
 */
export class GrammarSRSService {
    static createGrammarProgress(grammarId: string): GrammarProgress {
        return {
            grammarId,
            stage: 'learning',
            introductionAt: null,
            nextReviewAt: null,
            lastReviewedAt: null,
            totalReviews: 0,
            consecutiveFailures: 0,
            entry: {
                memoryStrength: CONSTANTS.srs.formula.minMemoryStrength,
                interval: 0,
                difficulty: CONSTANTS.srs.formula.initialDifficulty,
                lastReviewedAt: null,
                dueDate: null,
                history: [],
            },
        };
    }

    static applyGrammarIntroChoice(progress: GrammarProgress, choice: 'learn' | 'skip'): GrammarProgress {
        const updated: GrammarProgress = { ...progress, introductionAt: new Date() };

        if (choice === 'skip') {
            const maxS = CONSTANTS.srs.formula.mastery.maxMemoryStrength;
            updated.entry = {
                ...updated.entry,
                memoryStrength: maxS,
                interval: CONSTANTS.srs.formula.maxInterval,
                dueDate: null,
                lastReviewedAt: new Date(),
            };
            updated.nextReviewAt = null;
            updated.stage = 'graduated';
        } else {
            const now = new Date();
            updated.nextReviewAt = now;
            updated.entry = { ...updated.entry, dueDate: now };
        }

        return updated;
    }

    /**
     * Applies one answer's result to a GrammarProgress. `result` is the
     * combined result across every blank in the exercise (worst-of: any wrong
     * blank -> 'wrong', else any minor_error -> 'minor_error', else 'correct') -
     * computed by the caller, since only it knows the per-blank breakdown.
     */
    static applyAnswer(
        progress: GrammarProgress,
        result: AnswerResult,
        latencyMs: number,
        now: Date,
        intervalModifier: number = 1.0,
        frequencyModifier: number = 1.0
    ): { updated: GrammarProgress; result: AnswerResult; interval: number } {
        // Retry: mirrors VocabProgress.needsRetry - a successful/failed retry
        // doesn't touch SRS state, it's a training-only redo.
        if (progress.needsRetry) {
            const isSuccess = result === 'correct' || result === 'minor_error';
            return {
                updated: { ...progress, needsRetry: !isSuccess },
                result,
                interval: progress.entry.interval,
            };
        }

        const expectedLatency = CONSTANTS.srs.quizProperties.grammar.expectedLatency;
        const { newEntry, interval } = SRSService.calculateNextState(
            progress.entry, result, latencyMs, now, expectedLatency, intervalModifier, frequencyModifier
        );

        const finalStage = isGrammarFullyMastered({ entry: newEntry }) ? 'graduated' : progress.stage;
        const finalNextReviewAt = finalStage === 'graduated' ? null : grammarNextReviewAt({ entry: newEntry });

        return {
            updated: {
                ...progress,
                entry: newEntry,
                stage: finalStage,
                nextReviewAt: finalNextReviewAt,
                lastReviewedAt: now,
                totalReviews: progress.totalReviews + 1,
                consecutiveFailures: result === 'correct' ? 0 : progress.consecutiveFailures + 1,
                needsRetry: result === 'wrong',
            },
            result,
            interval,
        };
    }

    /** Finds the next batch of grammar point IDs eligible for learning, in JLPT order (N5 -> N1). */
    static async getNextCandidates(
        currentQueue: GrammarProgress[],
        maxToFind: number,
        ignoredIds: Set<string> = new Set()
    ): Promise<string[]> {
        if (maxToFind <= 0) return [];

        const index = await GrammarService.loadJlptIndex();
        if (!index) return [];

        const activeIds = new Set(currentQueue.map(g => g.grammarId));
        for (const id of ignoredIds) activeIds.add(id);

        const candidates: string[] = [];
        for (const level of GRAMMAR_JLPT_LEVELS) {
            for (const id of index[level] ?? []) {
                if (candidates.length >= maxToFind) return candidates;
                if (!activeIds.has(id)) candidates.push(id);
            }
        }
        return candidates;
    }

    static async countLearnableGrammar(currentQueue: GrammarProgress[], limit = Infinity): Promise<number> {
        const index = await GrammarService.loadJlptIndex();
        if (!index) return 0;

        const activeIds = new Set(currentQueue.map(g => g.grammarId));
        let count = 0;
        for (const level of GRAMMAR_JLPT_LEVELS) {
            for (const id of index[level] ?? []) {
                if (activeIds.has(id)) continue;
                count++;
                if (count >= limit) return count;
            }
        }
        return count;
    }

    static async hasMoreLearnableGrammar(currentQueue: GrammarProgress[]): Promise<boolean> {
        return (await this.countLearnableGrammar(currentQueue, 1)) > 0;
    }
}
