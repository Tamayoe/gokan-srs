import React, {
    useEffect,
    useMemo,
    useReducer,
    useState,
} from 'react';

import type { ReactNode } from 'react'

import type {
    KanjiKnowledge,
    UserProgress,
    UserSettings,
} from '../models/user.model';
import type { VocabProgress, Vocabulary } from '../models/vocabulary.model';
import { StorageService } from '../services/storage.service';
import { VocabularyService } from '../services/vocabulary.service';
import { SRSService } from '../services/srs.service';
import { QuizService } from '../services/quiz.service';

import { CONSTANTS } from '../commons/constants';
import { DEFAULT_SETTINGS } from '../models/user.model';
import { computeSessionView } from '../utils/quiz.utils';
import type { SetupCompleteValues, SetupValues } from "../models/state.model";
import { getNextVocabToStudy } from "../utils/srs.utils";
import { QuizContext } from "./useQuiz";
import { useGoogleDrive } from "./GoogleDriveContext";

/* =========================
   STATE & TYPES
   ========================= */

interface QuizState {
    progress: UserProgress | null;
    settings: UserSettings | null;
    currentVocab: Vocabulary | null;
    userAnswer: string;
    feedback: {
        show: boolean;
        correct: boolean;
        message: string;
    } | null;
    isLoadingVocab: boolean;
}

type QuizAction =
    | { type: 'SETUP_COMPLETE'; payload: SetupCompleteValues }
    | { type: 'LOAD_VOCAB_START' }
    | { type: 'LOAD_VOCAB_SUCCESS'; payload: Vocabulary | null }
    | { type: 'SET_ANSWER'; payload: string }
    | { type: 'SUBMIT_ANSWER'; payload: { isCorrect: boolean; message: string } }
    | { type: 'UPDATE_AFTER_ANSWER'; payload: { progress: UserProgress } }
    | { type: 'ADVANCE_QUEUE'; payload: { progress: UserProgress } }
    | { type: 'CLEAR_FEEDBACK' }
    | { type: 'UPDATE_KANJI_KNOWLEDGE'; payload: KanjiKnowledge }
    | { type: 'SAVE_SETTINGS'; payload: UserSettings }
    | { type: 'OVERRIDE_DAILY_LIMIT' }
    | { type: 'RESET' }
    | { type: 'VOCAB_INTRO_CHOICE'; vocabId: string; choice: 'learn' | 'skip'; };

const initialState: QuizState = {
    progress: null,
    settings: null,
    currentVocab: null,
    userAnswer: '',
    feedback: null,
    isLoadingVocab: false,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
    switch (action.type) {
        case 'SETUP_COMPLETE':
            return {
                ...state,
                progress: action.payload.progress,
                settings: action.payload.settings,
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

        case 'UPDATE_KANJI_KNOWLEDGE':
            return {
                ...state,
                progress: {
                    ...state.progress!,
                    kanjiKnowledge: action.payload,
                },
            };

        case 'OVERRIDE_DAILY_LIMIT':
            return {
                ...state,
                progress: state.progress
                    ? { ...state.progress, dailyOverride: true }
                    : null,
            };

        case 'RESET':
            return { ...initialState };

        case 'VOCAB_INTRO_CHOICE': {
            if (!state.progress) return state;

            return {
                ...state,
                progress: {
                    ...state.progress,
                    learningQueue: state.progress.learningQueue.map(progress =>
                        progress.vocabId === action.vocabId
                            ? SRSService.applyVocabIntroChoice(progress, action.choice)
                            : progress
                    ),
                },
            };
        }

        default:
            return state;
    }
}

/* =========================
   CONTEXT
   ========================= */

export interface QuizContextValue {
    state: QuizState;
    sessionState: ReturnType<typeof computeSessionView>['sessionState'];
    nextReviewAt: Date | null;
    currentProgress: VocabProgress | null;
    isSetupComplete: boolean;

    actions: {
        setupComplete(values: SetupValues): Promise<void>;
        setAnswer(answer: string): void;
        submitAnswer(): void;
        advanceQueue({ now, overrideDailyLimit }: { now: Date, overrideDailyLimit?: boolean }): void;
        continueToNext(): Promise<void>;
        saveSettings(settings: UserSettings): void;
        updateKanjiKnowledge(knowledge: KanjiKnowledge): void;
        overrideDailyLimit(): Promise<void>;
        saveVocabIntroChoice(vocabulary: Vocabulary, choice: 'learn' | 'skip'): void
        reset(): void;
    };

    computed: {
        canSubmit: boolean;
        canContinue: boolean;
        isReady: boolean;
    };
}


/* =========================
   PROVIDER
   ========================= */

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(quizReducer, {
        ...initialState,
        progress: StorageService.loadProgress(),
        settings: StorageService.loadSettings() ?? DEFAULT_SETTINGS,
    });

    /* ---------- Derived ---------- */

    const nextDue = useMemo(
        () => getNextVocabToStudy(state.progress?.learningQueue),
        [state.progress?.learningQueue]
    );

    const currentProgress = useMemo(() => {
        if (!state.currentVocab || !state.progress) return null;

        return state.progress.learningQueue.find(
            v => v.vocabId === state.currentVocab?.id
        ) ?? null;
    }, [state.currentVocab, state.progress]);

    const [hasMoreLearnable, setHasMoreLearnable] = useState(false);

    const sessionView = useMemo(
        () =>
            computeSessionView(
                state.progress,
                state.settings,
                hasMoreLearnable
            ),
        [state.progress, state.settings, hasMoreLearnable]
    );

    /* =========================
       ACTIONS
       ========================= */

    const actions: QuizContextValue['actions'] = {
        async setupComplete({ kanjiKnowledge, settings }) {
            const progress: UserProgress = {
                kanjiKnowledge,
                learningQueue: [],
                stats: {
                    newLearnedToday: 0,
                    totalLearned: 0,
                    totalReviews: 0,
                },
                dailyOverride: false,
            };

            progress.learningQueue = await SRSService.refillQueue(
                [],
                kanjiKnowledge,
                settings,
                CONSTANTS.srs.newVocabBatchSize
            );

            dispatch({
                type: 'SETUP_COMPLETE',
                payload: { progress, settings },
            });
        },

        setAnswer(answer) {
            dispatch({ type: 'SET_ANSWER', payload: answer });
        },

        submitAnswer() {
            if (!state.currentVocab || state.feedback?.show) return;

            const isCorrect = QuizService.validateAnswer(
                state.userAnswer,
                state.currentVocab.reading
            );

            dispatch({
                type: 'SUBMIT_ANSWER',
                payload: {
                    isCorrect,
                    message: isCorrect ? 'Correct.' : 'Incorrect.',
                },
            });
        },

        async advanceQueue({
            now,
            overrideDailyLimit = false,
        }) {
            const updatedQueue = state.progress!.learningQueue

            const dailyLimitReached =
                state.progress!.stats.newLearnedToday >=
                CONSTANTS.srs.dailyNewLimit &&
                !(state.progress!.dailyOverride || overrideDailyLimit);

            const nowDueCount = updatedQueue.filter(
                v => v.nextReviewAt && v.nextReviewAt <= now
            ).length;

            const canAddNew =
                nowDueCount === 0 &&
                (!dailyLimitReached || state.progress!.dailyOverride) &&
                sessionView.sessionState === "learn";

            const maxToAdd = canAddNew
                ? CONSTANTS.srs.newVocabBatchSize
                : 0;

            const finalQueue = await SRSService.refillQueue(
                updatedQueue,
                state.progress!.kanjiKnowledge,
                state.settings!,
                maxToAdd
            );

            dispatch({
                type: "ADVANCE_QUEUE",
                payload: {
                    progress: {
                        ...state.progress!,
                        learningQueue: finalQueue,
                    },
                },
            });
        },

        async continueToNext() {
            if (!state.progress || !state.feedback || !state.currentVocab) return;

            const now = new Date();
            const id = state.currentVocab.id;

            const updatedQueue = state.progress.learningQueue.map(v => {
                if (v.vocabId !== id) return v;

                const { updated } = SRSService.applyAnswer(
                    v,
                    state.feedback!.correct,
                    now
                );

                return updated;
            });

            const graduated = updatedQueue.some(
                v => v.vocabId === id && v.mastery === 100
            );

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

        updateKanjiKnowledge(knowledge: KanjiKnowledge) {
            dispatch({ type: 'UPDATE_KANJI_KNOWLEDGE', payload: knowledge })
        },

        async overrideDailyLimit() {
            dispatch({ type: "OVERRIDE_DAILY_LIMIT" });
        },

        saveVocabIntroChoice(vocabulary: Vocabulary, choice: "learn" | "skip") {
            dispatch({
                type: 'VOCAB_INTRO_CHOICE',
                choice: choice,
                vocabId: vocabulary.id
            })
        },

        reset() {
            StorageService.clearProgress();
            dispatch({ type: 'RESET' });
        },
    };

    /* ---------- Persistence ---------- */

    useEffect(() => {
        if (!state.progress || !state.settings) return;

        SRSService.hasMoreLearnableVocabulary(
            state.progress,
            state.settings
        ).then(setHasMoreLearnable);
    }, [state.progress, state.settings]);

    useEffect(() => {
        if (state.progress) StorageService.saveProgress(state.progress);
    }, [state.progress]);

    useEffect(() => {
        if (state.settings) StorageService.saveSettings(state.settings);
    }, [state.settings]);

    /* ---------- Auto-Sync ---------- */
    const { sync, isAuthenticated, isSyncing } = useGoogleDrive();

    useEffect(() => {
        if (state.progress && isAuthenticated && !isSyncing) {
            // Debounce or just trigger?
            // Since this runs on every progress update (every answer), we should ideally debounce.
            // But for now, let's keep it simple. The user asked for "on every significant progress change".
            // However, rapid-fire answers might cause race conditions if not careful.
            // Let's rely on the fact that sync handles locking via `isKey` or the service is robust enough?
            // Actually, triggering a network call on every answer is heavy.
            // Better to debounce.
            const timer = setTimeout(() => {
                sync().catch(console.error);
            }, 5000); // Sync 5 seconds after last change

            return () => clearTimeout(timer);
        }
    }, [state.progress, isAuthenticated]);

    /* ---------- Load vocab ---------- */

    useEffect(() => {
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
        canSubmit:
            !!state.userAnswer.trim() &&
            !!state.currentVocab &&
            !state.feedback?.show &&
            !state.isLoadingVocab,

        canContinue: !!(state.feedback?.show && !state.feedback.correct),

        isReady: !!state.currentVocab && !state.isLoadingVocab,
    };

    return (
        <QuizContext.Provider
            value={{
                state,
                sessionState: sessionView.sessionState,
                nextReviewAt: sessionView.nextReviewAt,
                currentProgress: currentProgress,
                isSetupComplete: !!state.progress,
                actions,
                computed,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
};

