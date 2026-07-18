import type { VocabProgress } from '../../models/vocabulary.model';
import type { Sentence } from '../../models/sentence.model';
import type { SessionState } from '../../models/state.model';
import { CONSTANTS } from '../../commons/constants';
import { getNextVocabToStudy } from '../../utils/srs.utils';
import type { QuizState, PendingQuizItem } from './quizReducer';

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

export interface SessionStats {
    done: number;
    remaining: number;
    total: number;
}

/**
 * Session-progress bookkeeping. There is no daily new-vocab cap anymore
 * (CONSTANTS.srs.dailyNewLimit is effectively infinite), so "remaining new
 * items" isn't a bounded number - when in 'learn' mode with nothing due we
 * surface one batch's worth as a stable estimate instead of a dead limit constant.
 */
export function selectSessionStats(
    state: Pick<QuizState, 'progress' | 'sessionHistory'>,
    sessionState: SessionState,
    now: Date = new Date()
): SessionStats {
    if (!state.progress) return { done: 0, remaining: 0, total: 0 };

    const done = state.sessionHistory.filter(h => h.result !== 'wrong').length;

    const dueReviews = state.progress.learningQueue.filter(
        v => v.nextReviewAt && v.nextReviewAt <= now
    ).length;

    let remaining = dueReviews;
    if (sessionState === 'learn' && dueReviews === 0) {
        remaining += CONSTANTS.srs.newVocabBatchSize;
    }

    return { done, remaining, total: done + remaining };
}
