import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { useLocation } from 'react-router-dom';
import type { GrammarPoint } from '../../models/grammar.model';
import { GrammarService } from '../../services/grammar.service';
import { GrammarSRSService } from '../../services/grammarSrs.service';
import type { AnswerResult } from '../../services/srs.service';
import { CONSTANTS } from '../../commons/constants';
import { calculateMasteryPercentage } from '../../utils/srs.utils';
import type { QuizState, QuizAction } from './quizReducer';
import {
    selectNextGrammarView,
    selectCurrentGrammarProgress,
    selectNextGrammarSessionPreview,
    selectGrammarSessionStats,
    collectActionableGrammarIds,
    computeBlankPlan,
    gradeGrammarAnswers,
} from './grammarSelectors';

export interface GrammarActions {
    setGrammarAnswer(index: number, value: string): void;
    revealGrammarHint(index: number): void;
    submitGrammarAnswer(): Promise<void>;
    advanceGrammarQueue(): Promise<void>;
    continueGrammarToNext(): Promise<void>;
    saveGrammarIntroChoice(grammarPoint: GrammarPoint, choice: 'learn' | 'skip'): void;
}

/**
 * Grammar's equivalent of useQuizOrchestration: loading, auto-advance timing,
 * and the submit/continue/advance/intro actions for the Grammar activity.
 * Deliberately does NOT duplicate persistence or Drive-sync wiring - those
 * effects in useQuizOrchestration already key off `state.progress` generically
 * (any dispatch that changes it gets saved/synced), and grammarQueue lives on
 * that same UserProgress object, so dispatching through the shared reducer
 * gets this for free.
 */
export function useGrammarOrchestration(state: QuizState, dispatch: Dispatch<QuizAction>) {
    const location = useLocation();

    const startTimeRef = useRef<number | null>(null);
    const submitLatencyRef = useRef<number | null>(null);
    const loadingKeyRef = useRef<string | null>(null);

    const [hasMoreLearnableGrammar, setHasMoreLearnableGrammar] = useState(false);

    useEffect(() => {
        if (!state.progress) return;
        GrammarSRSService.hasMoreLearnableGrammar(state.progress.grammarQueue).then(setHasMoreLearnableGrammar);
    }, [state.progress]);

    const grammarNextView = useMemo(
        () => selectNextGrammarView(state, hasMoreLearnableGrammar),
        [state.progress, state.grammarIntroCandidates, state.currentGrammarPoint, hasMoreLearnableGrammar]
    );

    const currentGrammarProgress = useMemo(
        () => selectCurrentGrammarProgress(state),
        [state.currentGrammarPoint, state.progress]
    );

    const nextGrammarSessionPreview = useMemo(
        () => selectNextGrammarSessionPreview(state),
        [state.progress]
    );

    const grammarSessionStats = useMemo(
        () => selectGrammarSessionStats(state, hasMoreLearnableGrammar),
        [state.progress, state.grammarSession, hasMoreLearnableGrammar]
    );

    /* ---------- Session lifecycle ---------- */

    // Mirrors useQuizOrchestration's vocab session-lifecycle effect (see its doc
    // comment for the full rationale): a grammar session is active only while the
    // user is on /grammar AND there is review/learn work, and ends the moment
    // either condition stops holding.
    useEffect(() => {
        if (!state.progress) return;
        const onGrammarRoute = location.pathname === '/grammar';
        const active = onGrammarRoute && (grammarNextView.sessionState === 'review' || grammarNextView.sessionState === 'learn');

        if (active && !state.grammarSession) {
            const grammarIds = collectActionableGrammarIds(state.progress.grammarQueue, new Date());
            dispatch({ type: 'GRAMMAR_SESSION_START', payload: { grammarIds } });
        } else if (!active && state.grammarSession) {
            dispatch({ type: 'GRAMMAR_SESSION_END' });
        }
    }, [grammarNextView.sessionState, state.grammarSession, state.progress, location.pathname]);

    /* =========================
       ACTIONS
       ========================= */

    const grammarActions: GrammarActions = {
        setGrammarAnswer(index, value) {
            dispatch({ type: 'GRAMMAR_SET_ANSWER', payload: { index, value } });
        },

        revealGrammarHint(index) {
            dispatch({ type: 'GRAMMAR_REVEAL_HINT', payload: { index } });
        },

        async submitGrammarAnswer() {
            if (!state.currentGrammarPoint || state.grammarFeedback?.show || !state.currentGrammarBlankPlan) return;
            if (state.currentGrammarBlankPlan.readOnly) return; // nothing to grade - handled by continueGrammarToNext directly

            submitLatencyRef.current = startTimeRef.current ? Date.now() - startTimeRef.current : null;

            const { perBlankResults, matchedAnswers, overall } = gradeGrammarAnswers(
                state.currentGrammarBlankPlan,
                state.grammarAnswers,
                state.grammarHintLevels
            );

            const message = overall === 'correct'
                ? 'Correct.'
                : overall === 'pass'
                    ? 'Revealed - marked as passed.'
                    : overall === 'minor_error'
                        ? 'Close.'
                        : 'Incorrect.';

            dispatch({ type: 'GRAMMAR_SUBMIT_ANSWER', payload: { type: overall, message, matchedAnswers, perBlankResults } });
        },

        async advanceGrammarQueue() {
            if (!state.progress) return;
            const updatedQueue = state.progress.grammarQueue;
            const now = new Date();

            const nowDueCount = updatedQueue.filter(g => g.nextReviewAt && g.nextReviewAt <= now).length;
            const canAddNew = nowDueCount === 0 && grammarNextView.sessionState !== 'waiting';
            const needsCandidates = canAddNew && state.grammarIntroCandidates.length === 0;

            const newCandidates: GrammarPoint[] = [];

            if (needsCandidates) {
                const currentCandidateIds = new Set(state.grammarIntroCandidates.map(c => c.id));
                const maxToFind = CONSTANTS.srs.newVocabBatchSize - state.grammarIntroCandidates.length;

                const candidateIds = await GrammarSRSService.getNextCandidates(updatedQueue, maxToFind, currentCandidateIds);

                for (const id of candidateIds) {
                    try {
                        const point = await GrammarService.loadGrammarPoint(id);
                        if (point) newCandidates.push(point);
                    } catch (e) {
                        console.error(`[useGrammarOrchestration] Failed to load candidate ${id}`, e);
                    }
                }

                if (candidateIds.length > 0 && newCandidates.length === 0) {
                    console.error('[useGrammarOrchestration] CRITICAL: Found candidates in index, but ALL failed to load.', { candidateIds });
                    dispatch({
                        type: 'GRAMMAR_LOAD_ERROR',
                        payload: { grammarId: candidateIds[0], error: new Error('Candidate grammar files could not be loaded. Data might be corrupted or out-of-sync.') },
                    });
                    return;
                }
            }

            dispatch({
                type: 'GRAMMAR_ADVANCE_QUEUE',
                payload: {
                    progress: { ...state.progress, grammarQueue: updatedQueue },
                    candidates: newCandidates.length > 0 ? [...state.grammarIntroCandidates, ...newCandidates] : undefined,
                },
            });
        },

        async continueGrammarToNext() {
            if (!state.progress || !state.currentGrammarPoint) return;

            const now = new Date();
            const id = state.currentGrammarPoint.id;
            const title = state.currentGrammarPoint.title;

            const target = state.progress.grammarQueue.find(g => g.grammarId === id);
            if (!target) return;

            let updatedQueue;
            let historyItem: { grammarId: string; title: string; result: AnswerResult; delta: number } | null = null;

            if (state.currentGrammarBlankPlan?.readOnly) {
                // No blank-eligible word anywhere in this point's examples - there's
                // nothing to grade, so this must not touch memoryStrength/interval
                // (no SRS credit either way). Just defer the due date so the same
                // ungradable card doesn't reappear on the very next pick.
                const deferred = GrammarSRSService.deferWithoutCredit(target, now);
                updatedQueue = state.progress.grammarQueue.map(g => g.grammarId === id ? deferred : g);
            } else {
                if (!state.grammarFeedback) return;
                const latency = submitLatencyRef.current ?? 5000;
                const { updated } = GrammarSRSService.applyAnswer(target, state.grammarFeedback.type, latency, now);
                updatedQueue = state.progress.grammarQueue.map(g => g.grammarId === id ? updated : g);

                const delta = calculateMasteryPercentage(updated.entry.memoryStrength) - calculateMasteryPercentage(target.entry.memoryStrength);
                historyItem = { grammarId: id, title, result: state.grammarFeedback.type, delta };
            }

            dispatch({
                type: 'GRAMMAR_UPDATE_AFTER_ANSWER',
                payload: { progress: { ...state.progress, grammarQueue: updatedQueue }, historyItem },
            });
        },

        saveGrammarIntroChoice(grammarPoint, choice) {
            if (!state.progress) return;
            dispatch({ type: 'GRAMMAR_INTRO_CHOICE', choice, grammarId: grammarPoint.id, grammarPoint });
        },
    };

    /* ---------- Load grammar point ---------- */

    useEffect(() => {
        // Route-gated exactly like vocab's /quiz effect - browsing anywhere else
        // must not keep fetching grammar JSON or silently advancing the queue.
        if (location.pathname !== '/grammar') return;

        const queueItem = grammarNextView.queueItem;

        if (!queueItem) {
            dispatch({ type: 'GRAMMAR_LOAD_SUCCESS', payload: { point: null, blankPlan: null } });

            if (state.progress && (grammarNextView.sessionState === 'learn' || grammarNextView.sessionState === 'exhausted')) {
                grammarActions.advanceGrammarQueue();
            }
            return;
        }

        // Already loaded or currently loading exactly this grammar point -
        // GRAMMAR_LOAD_START sets currentGrammarQuizItem synchronously, so this
        // single comparison covers both cases (see useQuizOrchestration's
        // equivalent guard for why currentGrammarPoint alone can't detect the
        // in-flight case).
        if (state.currentGrammarQuizItem?.grammarId === queueItem.grammarId) {
            return;
        }

        dispatch({ type: 'GRAMMAR_LOAD_START', payload: queueItem });

        const loadKey = queueItem.grammarId;
        loadingKeyRef.current = loadKey;

        GrammarService.loadGrammarPoint(queueItem.grammarId).then(async point => {
            if (loadingKeyRef.current !== loadKey) return; // superseded by a newer target

            const existing = state.progress?.grammarQueue.find(g => g.grammarId === point.id);
            const blankPlan = await computeBlankPlan(point, state.progress, existing?.totalReviews ?? 0);
            if (loadingKeyRef.current !== loadKey) return; // superseded while awaiting the blank plan's vocab fetches

            dispatch({ type: 'GRAMMAR_LOAD_SUCCESS', payload: { point, blankPlan } });
            startTimeRef.current = Date.now();
        }).catch(err => {
            if (loadingKeyRef.current !== loadKey) return;
            console.error('[useGrammarOrchestration] Failed to load grammar point', err);
            dispatch({ type: 'GRAMMAR_LOAD_ERROR', payload: { grammarId: queueItem.grammarId, error: err } });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grammarNextView.queueItem, state.progress, grammarNextView.sessionState, location.pathname]);

    useEffect(() => {
        if (state.grammarFeedback?.correct) {
            const timer = setTimeout(() => {
                grammarActions.continueGrammarToNext().then();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.grammarFeedback?.correct]);

    /* =========================
       COMPUTED FLAGS
       ========================= */

    const grammarComputed = {
        canSubmitGrammar:
            !!state.currentGrammarPoint &&
            !!state.currentGrammarBlankPlan &&
            !state.currentGrammarBlankPlan.readOnly &&
            state.currentGrammarBlankPlan.blankWordIndices.length > 0 &&
            !state.grammarFeedback?.show &&
            !state.isLoadingGrammar &&
            state.grammarAnswers.every(a => a.trim().length > 0),

        canContinueGrammar: !!state.grammarFeedback?.show,

        isGrammarReady: !!state.currentGrammarPoint && !state.isLoadingGrammar,
    };

    return { grammarActions, grammarNextView, currentGrammarProgress, grammarComputed, nextGrammarSessionPreview, grammarSessionStats };
}
