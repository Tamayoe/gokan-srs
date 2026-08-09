import type { GrammarProgress } from '../models/grammar.model';
import { GRAMMAR_JLPT_LEVELS } from '../models/grammar.model';
import type { VocabProgress } from '../models/vocabulary.model';
import type { UserSettings } from '../models/user.model';
import type { AnswerResult } from './srs.service';
import { SRSService } from './srs.service';
import { CONSTANTS } from '../commons/constants';
import { GrammarService } from './grammar.service';
import { isGrammarFullyMastered, grammarNextReviewAt } from './grammarScheduling';
import { newSRSEntry } from './scheduling';
import { collectJlptCandidates, countJlptCandidates } from './jlptWalk';

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
            entry: newSRSEntry(),
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
        frequencyModifier: number = 1.0,
        // Scales the grammar point's memory-strength gain by how well the
        // sentence's *vocab* blanks went (see gradeGrammarAnswers): a demonstrated
        // grammar core always keeps its result, but earns proportionally less when
        // the surrounding vocab was missed. 1.0 = full gain.
        strengthDeltaModifier: number = 1.0
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
            progress.entry, result, latencyMs, now, expectedLatency, intervalModifier, frequencyModifier, strengthDeltaModifier
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

    /**
     * Advances a GrammarProgress past the current turn WITHOUT touching its SRS
     * state (memoryStrength/interval/difficulty untouched, so this genuinely
     * grants no credit) - used for the rare grammar point where none of its
     * examples have a single blankable word (computeBlankPlan's read-only
     * fallback), where there is nothing to grade. Only reschedules `dueDate`
     * forward by a fixed cooldown so the same ungradable card doesn't
     * immediately reappear on the very next queue pick.
     */
    static deferWithoutCredit(progress: GrammarProgress, now: Date): GrammarProgress {
        const deferredDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return {
            ...progress,
            entry: { ...progress.entry, dueDate: deferredDueDate },
            nextReviewAt: deferredDueDate,
            lastReviewedAt: now,
            totalReviews: progress.totalReviews + 1,
        };
    }

    /**
     * Applies POSITIVE-ONLY vocab credit to the user's learning queue for the
     * non-pattern (vocab reinforcement) blanks the user answered correctly in a
     * grammar sentence. A correctly recalled word in a grammar exercise is a real
     * reading review, so it feeds that word's own SRS entry - but only ever
     * upward: `credits` is pre-filtered to correct/minor_error results, and a word
     * not in the learning queue is skipped entirely. A wrong vocab blank never
     * reaches here, so grammar practice can never penalise vocab.
     *
     * Latency is neutralised (expectedLatency) rather than threaded through from
     * the card, since the single card-level timing can't be attributed per blank
     * and a stray fast/slow submit shouldn't skew an individual word's difficulty.
     */
    static applyVocabReinforcement(
        learningQueue: VocabProgress[],
        credits: { vocabId: string; result: AnswerResult }[],
        now: Date,
        settings: UserSettings
    ): VocabProgress[] {
        if (credits.length === 0) return learningQueue;

        const frequencyModifier = CONSTANTS.srs.frequencyMultipliers[settings.learningFrequency];
        const meaningEnabled = settings.enableMeaningQuiz !== false;
        const neutralLatency = CONSTANTS.srs.quizProperties.reading.expectedLatency;

        let changed = false;
        const next = learningQueue.map(vp => {
            const credit = credits.find(c => c.vocabId === vp.vocabId);
            if (!credit || (credit.result !== 'correct' && credit.result !== 'minor_error')) return vp;

            // correctAnswer is unused because forcedResult (credit.result) is supplied.
            const { updated } = SRSService.applyAnswer(
                vp, 'reading', 'base', '', '',
                neutralLatency, now, credit.result, 1.0, frequencyModifier, meaningEnabled
            );
            changed = true;
            return updated;
        });

        return changed ? next : learningQueue;
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

        return collectJlptCandidates<string>(
            GRAMMAR_JLPT_LEVELS,
            level => index[level] ?? [],
            id => id,
            id => !activeIds.has(id),
            maxToFind
        );
    }

    static async countLearnableGrammar(currentQueue: GrammarProgress[], limit = Infinity): Promise<number> {
        const index = await GrammarService.loadJlptIndex();
        if (!index) return 0;

        const activeIds = new Set(currentQueue.map(g => g.grammarId));
        return countJlptCandidates<string>(
            GRAMMAR_JLPT_LEVELS,
            level => index[level] ?? [],
            id => !activeIds.has(id),
            limit
        );
    }

    static async hasMoreLearnableGrammar(currentQueue: GrammarProgress[]): Promise<boolean> {
        return (await this.countLearnableGrammar(currentQueue, 1)) > 0;
    }
}
