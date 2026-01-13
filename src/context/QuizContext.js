import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useMemo, useReducer, useState, } from 'react';
import { StorageService } from '../services/storage.service';
import { VocabularyService } from '../services/vocabulary.service';
import { SRSService } from '../services/srs.service';
import { QuizService } from '../services/quiz.service';
import { CONSTANTS } from '../commons/constants';
import { DEFAULT_SETTINGS } from '../models/user.model';
import { computeSessionView } from '../utils/quiz.utils';
import { getNextVocabToStudy } from "../utils/srs.utils";
import { QuizContext } from "./useQuiz";
const initialState = {
    progress: null,
    settings: null,
    currentVocab: null,
    userAnswer: '',
    feedback: null,
    isLoadingVocab: false,
    isSetupComplete: false,
};
function quizReducer(state, action) {
    switch (action.type) {
        case 'SETUP_COMPLETE':
            return {
                ...state,
                progress: action.payload.progress,
                settings: action.payload.settings,
                isSetupComplete: true,
            };
        case 'LOAD_VOCAB_START':
            return {
                ...state,
                isLoadingVocab: true,
                userAnswer: '',
                feedback: null,
            };
        case 'LOAD_VOCAB_SUCCESS':
            return {
                ...state,
                currentVocab: action.payload,
                isLoadingVocab: false,
            };
        case 'SET_ANSWER':
            return { ...state, userAnswer: action.payload };
        case 'SUBMIT_ANSWER':
            return {
                ...state,
                feedback: {
                    show: true,
                    correct: action.payload.isCorrect,
                    message: action.payload.message,
                },
            };
        case 'UPDATE_AFTER_ANSWER':
        case 'ADVANCE_QUEUE':
            return {
                ...state,
                progress: action.payload.progress,
                feedback: null,
                userAnswer: '',
            };
        case 'CLEAR_FEEDBACK':
            return { ...state, feedback: null };
        case 'SAVE_SETTINGS':
            return { ...state, settings: action.payload };
        case 'OVERRIDE_DAILY_LIMIT':
            return {
                ...state,
                progress: state.progress
                    ? { ...state.progress, dailyOverride: true }
                    : null,
            };
        case 'RESET':
            return { ...initialState };
        default:
            return state;
    }
}
/* =========================
   PROVIDER
   ========================= */
export const QuizProvider = ({ children }) => {
    const [state, dispatch] = useReducer(quizReducer, {
        ...initialState,
        progress: StorageService.loadProgress(),
        settings: StorageService.loadSettings() ?? DEFAULT_SETTINGS,
        isSetupComplete: !!StorageService.loadProgress(),
    });
    /* ---------- Derived ---------- */
    const nextDue = useMemo(() => getNextVocabToStudy(state.progress?.learningQueue), [state.progress?.learningQueue]);
    const currentProgress = useMemo(() => {
        if (!state.currentVocab || !state.progress)
            return null;
        return state.progress.learningQueue.find(v => v.vocabId === state.currentVocab?.id) ?? null;
    }, [state.currentVocab, state.progress]);
    const [hasMoreLearnable, setHasMoreLearnable] = useState(false);
    const sessionView = useMemo(() => computeSessionView(state.progress, state.settings, hasMoreLearnable), [state.progress, state.settings, hasMoreLearnable]);
    /* =========================
       ACTIONS
       ========================= */
    const actions = {
        async setupComplete({ kanjiKnowledge, settings }) {
            const progress = {
                kanjiKnowledge,
                learningQueue: [],
                stats: {
                    newLearnedToday: 0,
                    totalLearned: 0,
                    totalReviews: 0,
                },
                dailyOverride: false,
            };
            progress.learningQueue = await SRSService.refillQueue([], kanjiKnowledge, settings, CONSTANTS.srs.newVocabBatchSize);
            dispatch({
                type: 'SETUP_COMPLETE',
                payload: { progress, settings },
            });
        },
        setAnswer(answer) {
            dispatch({ type: 'SET_ANSWER', payload: answer });
        },
        submitAnswer() {
            if (!state.currentVocab || state.feedback?.show)
                return;
            const isCorrect = QuizService.validateAnswer(state.userAnswer, state.currentVocab.readings);
            dispatch({
                type: 'SUBMIT_ANSWER',
                payload: {
                    isCorrect,
                    message: isCorrect ? 'Correct.' : 'Incorrect.',
                },
            });
        },
        async advanceQueue({ now, overrideDailyLimit = false, }) {
            const updatedQueue = state.progress.learningQueue;
            const dailyLimitReached = state.progress.stats.newLearnedToday >=
                CONSTANTS.srs.dailyNewLimit &&
                !(state.progress.dailyOverride || overrideDailyLimit);
            const nowDueCount = updatedQueue.filter(v => v.nextReviewAt && v.nextReviewAt <= now).length;
            const canAddNew = nowDueCount === 0 &&
                (!dailyLimitReached || state.progress.dailyOverride) &&
                sessionView.sessionState === "learn";
            const maxToAdd = canAddNew
                ? CONSTANTS.srs.newVocabBatchSize
                : 0;
            console.debug('advance, prepare to refill');
            const finalQueue = await SRSService.refillQueue(updatedQueue, state.progress.kanjiKnowledge, state.settings, maxToAdd);
            dispatch({
                type: "ADVANCE_QUEUE",
                payload: {
                    progress: {
                        ...state.progress,
                        learningQueue: finalQueue,
                    },
                },
            });
        },
        async continueToNext() {
            if (!state.progress || !state.feedback || !state.currentVocab)
                return;
            const now = new Date();
            const id = state.currentVocab.id;
            const updatedQueue = state.progress.learningQueue.map(v => {
                if (v.vocabId !== id)
                    return v;
                const { updated } = SRSService.applyAnswer(v, state.feedback.correct, now);
                console.debug('updated vocab!', updated);
                return updated;
            });
            const graduated = updatedQueue.some(v => v.vocabId === id && v.mastery === 100);
            dispatch({
                type: "UPDATE_AFTER_ANSWER",
                payload: {
                    progress: {
                        ...state.progress,
                        learningQueue: updatedQueue,
                        stats: {
                            ...state.progress.stats,
                            totalReviews: state.progress.stats.totalReviews + 1,
                            totalLearned: graduated
                                ? state.progress.stats.totalLearned + 1
                                : state.progress.stats.totalLearned,
                        },
                    },
                },
            });
        },
        saveSettings(settings) {
            dispatch({ type: 'SAVE_SETTINGS', payload: settings });
        },
        async overrideDailyLimit() {
            dispatch({ type: "OVERRIDE_DAILY_LIMIT" });
        },
        reset() {
            StorageService.clearProgress();
            dispatch({ type: 'RESET' });
        },
    };
    /* ---------- Persistence ---------- */
    useEffect(() => {
        if (!state.progress || !state.settings)
            return;
        SRSService.hasMoreLearnableVocabulary(state.progress, state.settings).then(setHasMoreLearnable);
    }, [state.progress, state.settings]);
    useEffect(() => {
        if (state.progress)
            StorageService.saveProgress(state.progress);
    }, [state.progress]);
    useEffect(() => {
        if (state.settings)
            StorageService.saveSettings(state.settings);
    }, [state.settings]);
    /* ---------- Load vocab ---------- */
    useEffect(() => {
        console.debug('next due', nextDue);
        if (!nextDue) {
            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: null });
            return;
        }
        dispatch({ type: 'LOAD_VOCAB_START' });
        let alive = true;
        VocabularyService.loadVocab(nextDue.vocabId).then(vocab => {
            if (alive) {
                dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: vocab });
            }
        });
        return () => {
            alive = false;
        };
    }, [nextDue]);
    useEffect(() => {
        if (state.feedback?.correct) {
            const timer = setTimeout(() => {
                actions.continueToNext().then();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);
            return () => clearTimeout(timer);
        }
    }, [state.feedback?.correct]);
    /* =========================
       COMPUTED FLAGS
       ========================= */
    const computed = {
        canSubmit: !!state.userAnswer.trim() &&
            !!state.currentVocab &&
            !state.feedback?.show &&
            !state.isLoadingVocab,
        canContinue: !!(state.feedback?.show && !state.feedback.correct),
        isReady: !!state.currentVocab && !state.isLoadingVocab,
    };
    return (_jsx(QuizContext.Provider, { value: {
            state,
            sessionState: sessionView.sessionState,
            nextReviewAt: sessionView.nextReviewAt,
            currentProgress: currentProgress,
            actions,
            computed,
        }, children: children }));
};
