import type { VocabProgress } from '../../models/vocabulary.model';
import type { Sentence } from '../../models/sentence.model';
import type { SessionState } from '../../models/state.model';
import type { UserSettings } from '../../models/user.model';
import { getNextVocabToStudy, isReadingActionable, isMeaningActionable } from '../../utils/srs.utils';
import type { QuizType } from '../../utils/srs.utils';
import type { QuizState, PendingQuizItem, TaskKey } from './quizReducer';
import { taskKey } from './quizReducer';
import { computeSessionState } from './sessionState';
import { computeSessionStats, computeSessionPreview } from './sessionStats';

/**
 * Single source of truth for "what should the quiz screen show right now".
 * Replaces three previously-independent decision points that had to be kept in
 * agreement by hand: the `nextDue` memo (queue-level "what to load"),
 * `computeSessionView` (session-level "what mode are we in"), and QuizScreen's
 * own ad-hoc `currentProgress.introductionAt` check (intro-vs-quiz).
 */
export interface NextViewResult {
    /** The queue item that should be loaded/displayed next, or null if nothing is due/learnable right now. */
    queueItem: PendingQuizItem | null;
    sessionState: SessionState;
    nextReviewAt: Date | null;
    /** True when the currently-loaded vocab hasn't been introduced yet and should show the intro card. */
    shouldShowIntro: boolean;
}

export function selectNextView(
    state: Pick<QuizState, 'progress' | 'settings' | 'introCandidates' | 'currentVocab' | 'currentQuizItem' | 'nextKanjiToLearn'>,
    hasMoreLearnable: boolean,
    now: Date = new Date()
): NextViewResult {
    const { progress, settings, introCandidates } = state;

    // Hint getNextVocabToStudy to stay on whichever quiz type is currently on
    // screen (see its doc comment) - prevents a reading item becoming actionable
    // mid-meaning-batch (or vice versa) from hijacking the next card.
    const preferredType = state.currentQuizItem?.quizType;

    const queueItem: PendingQuizItem | null = introCandidates.length > 0
        ? { vocabId: introCandidates[0].id, quizType: 'reading', quizMode: 'base' }
        : getNextVocabToStudy(progress?.learningQueue, settings ?? undefined, now, preferredType);

    const { sessionState, nextReviewAt } = computeSessionState<VocabProgress, SessionState>(
        progress && settings ? progress.learningQueue : undefined,
        {
            isLearning: v => v.stage === 'learning',
            isDue: v => !!v.nextReviewAt && v.nextReviewAt <= now,
            nextReviewAtOf: v => v.nextReviewAt,
            canLearn: hasMoreLearnable || introCandidates.length > 0,
            states: { review: 'review', learn: 'learn', waiting: 'waiting', exhausted: 'exhausted' },
            extraState: state.nextKanjiToLearn ? 'learn-kanji' : null,
        }
    );

    let shouldShowIntro = false;
    if (state.currentVocab && progress) {
        const vocabProgress = progress.learningQueue.find(v => v.vocabId === state.currentVocab!.id);
        shouldShowIntro = !vocabProgress || !vocabProgress.introductionAt;
    }

    return { queueItem, sessionState, nextReviewAt, shouldShowIntro };
}

export interface NextSessionPreview {
    review: number;
    new: number;
    retries: number;
}

/**
 * Preview of what the next study session will contain, bucketed per distinct
 * vocab in `learningQueue` (graduated items excluded). Buckets are mutually
 * exclusive - first match wins, in this order:
 *   1. retries - a pending reading or meaning retry from a previous/abandoned session
 *   2. new     - queued but never reviewed once (totalReviews === 0)
 *   3. review  - due now (reuses isReadingActionable/isMeaningActionable, which
 *                by this point can only match their "due" branch since the
 *                retry and first-review cases were already claimed above)
 * Counts distinct vocab (words), not individual reading/meaning tasks - see
 * the issue's rationale for why task-level counting isn't worth the noise.
 */
export function selectNextSessionPreview(
    state: Pick<QuizState, 'progress' | 'settings'>,
    now: Date = new Date()
): NextSessionPreview {
    if (!state.progress) return { review: 0, new: 0, retries: 0 };

    return computeSessionPreview(state.progress.learningQueue, {
        isGraduated: v => v.stage === 'graduated',
        isRetry: v => !!(v.needsRetry?.reading || v.needsRetry?.meaning),
        isNew: v => v.totalReviews === 0,
        isDue: v => isReadingActionable(v, now) || isMeaningActionable(v, state.settings ?? undefined, now),
    });
}

export function selectCurrentProgress(
    state: Pick<QuizState, 'currentVocab' | 'progress'>
): VocabProgress | null {
    if (!state.currentVocab || !state.progress) return null;
    return state.progress.learningQueue.find(v => v.vocabId === state.currentVocab!.id) ?? null;
}

export function selectCurrentSentence(
    state: Pick<QuizState, 'currentSentences' | 'currentSentenceId'>
): Sentence | null {
    if (!state.currentSentences || !state.currentSentenceId) return null;
    return state.currentSentences.find(s => s.id === state.currentSentenceId) ?? null;
}

/** Every quiz task actionable right now, as task keys (`vocabId:quizType`). */
export function collectActionableTaskKeys(
    queue: VocabProgress[],
    settings: UserSettings | undefined,
    now: Date
): TaskKey[] {
    const keys: TaskKey[] = [];
    for (const v of queue) {
        if (isReadingActionable(v, now)) keys.push(taskKey(v.vocabId, 'reading'));
        if (isMeaningActionable(v, settings, now)) keys.push(taskKey(v.vocabId, 'meaning'));
    }
    return keys;
}

function parseTaskKey(key: string): { vocabId: string; quizType: QuizType } {
    const idx = key.lastIndexOf(':');
    return { vocabId: key.slice(0, idx), quizType: key.slice(idx + 1) as QuizType };
}

/**
 * Drops a vocab's meaning task from a session-commit snapshot when its
 * reading is committed too. Answering that reading correctly staggers the
 * meaning's due date forward by 12h (see SRSService.applyAnswer's
 * reading -> meaning stagger), so committing both counts the meaning as part
 * of the session's workload even though it's very likely to be silently
 * cleared without ever actually being answered - the same single answer then
 * increments `done` by 2 instead of 1. Mirrors how VOCAB_INTRO_CHOICE's
 * "Learn" path already treats a freshly-learned word (only reading joins the
 * session; the staggered meaning surfaces later as "waiting" instead). Only
 * applied at commit time - the live actionable set collectActionableTaskKeys
 * produces elsewhere (for the done/waiting checks) is left untouched, since a
 * wrong reading answer does NOT stagger meaning and it must still be
 * reachable.
 */
export function filterSessionCommit(taskKeys: TaskKey[]): TaskKey[] {
    const readingVocabIds = new Set(
        taskKeys
            .map(parseTaskKey)
            .filter(({ quizType }) => quizType === 'reading')
            .map(({ vocabId }) => vocabId)
    );

    return taskKeys.filter(key => {
        const { vocabId, quizType } = parseTaskKey(key);
        return !(quizType === 'meaning' && readingVocabIds.has(vocabId));
    });
}

export interface SessionStats {
    /** Committed session tasks the user has cleared (answered, deferred, or graduated out). */
    done: number;
    /** Size of the committed session task set - the stable progress denominator. */
    total: number;
    /** Committed tasks currently awaiting a retry (a wrong answer this session). Shown highlighted. */
    retriesPending: number;
    /** Distinct vocab with tasks due now that are NOT part of this session (came due mid-session). */
    waiting: number;
    /** True when brand-new vocab can still be learned beyond this session (the "+" in "n+ waiting"). */
    moreNew: boolean;
}

/**
 * Session-progress bookkeeping, computed against the session's frozen committed
 * task set (see SessionTracking) rather than the live due count.
 *
 * The previous implementation derived `total` from `done + liveDueReviews`, which
 * shrank on every wrong answer: a wrong answer pushes the item's due date ~12h out
 * (so it leaves `liveDueReviews`) without incrementing `done` (wrong answers were
 * filtered out), and the pending retry was never re-counted. The denominator
 * therefore ticked *down* as the user worked. Now `total` is the committed set's
 * fixed size; `done` counts committed tasks that are no longer actionable; retries
 * and mid-session arrivals are surfaced separately instead of corrupting the total.
 */
export function selectSessionStats(
    state: Pick<QuizState, 'progress' | 'settings' | 'session'>,
    hasMoreLearnable: boolean,
    now: Date = new Date()
): SessionStats {
    if (!state.progress) {
        return { done: 0, total: 0, retriesPending: 0, waiting: 0, moreNew: hasMoreLearnable };
    }

    const queue = state.progress.learningQueue;
    const byId = new Map(queue.map(v => [v.vocabId, v]));

    const core = computeSessionStats({
        committed: state.session?.committed ?? [],
        actionable: collectActionableTaskKeys(queue, state.settings ?? undefined, now),
        isRetry: key => {
            const { vocabId, quizType } = parseTaskKey(key);
            return byId.get(vocabId)?.needsRetry?.[quizType] === true;
        },
        // Distinct vocab: a word's reading + meaning both waiting count once.
        waitingCountOf: keys => new Set(keys.map(k => parseTaskKey(k).vocabId)).size,
    });

    return { ...core, moreNew: hasMoreLearnable };
}
