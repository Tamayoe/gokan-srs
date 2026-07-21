import type { VocabProgress } from '../../models/vocabulary.model';
import type { Sentence } from '../../models/sentence.model';
import type { SessionState } from '../../models/state.model';
import type { UserSettings } from '../../models/user.model';
import { getNextVocabToStudy, isReadingActionable, isMeaningActionable } from '../../utils/srs.utils';
import type { QuizType } from '../../utils/srs.utils';
import type { QuizState, PendingQuizItem, TaskKey } from './quizReducer';
import { taskKey } from './quizReducer';

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
    state: Pick<QuizState, 'progress' | 'settings' | 'introCandidates' | 'currentVocab' | 'nextKanjiToLearn'>,
    hasMoreLearnable: boolean,
    now: Date = new Date()
): NextViewResult {
    const { progress, settings, introCandidates } = state;

    const queueItem: PendingQuizItem | null = introCandidates.length > 0
        ? { vocabId: introCandidates[0].id, quizType: 'reading', quizMode: 'base' }
        : getNextVocabToStudy(progress?.learningQueue, settings ?? undefined, now);

    let sessionState: SessionState = 'exhausted';
    let nextReviewAt: Date | null = null;

    if (progress && settings) {
        const learning = progress.learningQueue.filter(v => v.stage === 'learning');
        const due = learning.filter(v => v.nextReviewAt && v.nextReviewAt <= now);

        if (due.length > 0) {
            sessionState = 'review';
        } else {
            nextReviewAt = learning
                .map(v => v.nextReviewAt)
                .filter((d): d is NonNullable<typeof d> => !!d)
                .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

            const canLearn = hasMoreLearnable || introCandidates.length > 0;
            sessionState = canLearn
                ? 'learn'
                : state.nextKanjiToLearn
                    ? 'learn-kanji'
                    : learning.length > 0
                        ? 'waiting'
                        : 'exhausted';
        }
    }

    let shouldShowIntro = false;
    if (state.currentVocab && progress) {
        const vocabProgress = progress.learningQueue.find(v => v.vocabId === state.currentVocab!.id);
        shouldShowIntro = !vocabProgress || !vocabProgress.introductionAt;
    }

    return { queueItem, sessionState, nextReviewAt, shouldShowIntro };
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

function parseTaskKey(key: TaskKey): { vocabId: string; quizType: QuizType } {
    const idx = key.lastIndexOf(':');
    return { vocabId: key.slice(0, idx), quizType: key.slice(idx + 1) as QuizType };
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
    const empty: SessionStats = { done: 0, total: 0, retriesPending: 0, waiting: 0, moreNew: hasMoreLearnable };
    if (!state.progress) return empty;

    const committed = state.session?.committed ?? [];
    const committedSet = new Set<TaskKey>(committed);
    const total = committedSet.size;

    const queue = state.progress.learningQueue;
    const byId = new Map(queue.map(v => [v.vocabId, v]));

    const actionable = collectActionableTaskKeys(queue, state.settings ?? undefined, now);
    const actionableSet = new Set<TaskKey>(actionable);

    // A committed task is "done" once it is no longer actionable (answered correctly,
    // deferred by the reading→meaning stagger, or graduated). Still-actionable
    // committed tasks are either not yet answered or awaiting a retry.
    let done = 0;
    let retriesPending = 0;
    for (const key of committedSet) {
        if (!actionableSet.has(key)) {
            done++;
            continue;
        }
        const { vocabId, quizType } = parseTaskKey(key);
        if (byId.get(vocabId)?.needsRetry?.[quizType]) retriesPending++;
    }

    // Reviews that came due AFTER the session started (not committed) don't inflate
    // the total - they're reported as vocab waiting for a future session.
    const waitingVocab = new Set<string>();
    for (const key of actionableSet) {
        if (!committedSet.has(key)) waitingVocab.add(parseTaskKey(key).vocabId);
    }

    return {
        done,
        total,
        retriesPending,
        waiting: waitingVocab.size,
        moreNew: hasMoreLearnable,
    };
}
