import type {KanjiKnowledge, UserProgress, UserSettings} from "../models/user.model.ts";
import type {Vocabulary} from "../models/vocabulary.model.ts";
import React, {createContext, ReactNode, useContext, useEffect, useReducer} from "react";
import {StorageService} from "../services/storage.service.ts";
import {VocabularyService} from "../services/vocabulary.service.ts";
import {CONSTANTS} from "../commons/constants.ts";
import {SRSService} from "../services/srs.service.ts";
import {QuizService} from "../services/quiz.service.ts";
import {DEFAULT_SETTINGS} from "../models/user.model.ts";
import type {SetupValues} from "../pages/setup/SetupScreen.tsx";

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
    isSetupComplete: boolean;
}

type QuizAction =
    | { type: 'SETUP_COMPLETE'; payload: SetupCompleteValues }
    | { type: 'LOAD_VOCAB_START' }
    | { type: 'LOAD_VOCAB_SUCCESS'; payload: Vocabulary }
    | { type: 'SET_ANSWER'; payload: string }
    | { type: 'SUBMIT_ANSWER'; payload: { isCorrect: boolean; message: string } }
    | { type: 'CONTINUE_TO_NEXT'; payload: { progress: UserProgress } }
    | { type: 'CLEAR_FEEDBACK' }
    | { type: 'RESET' }
    | { type: 'SAVE_SETTINGS'; payload: { settings: UserSettings } };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
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
            return {
                ...state,
                userAnswer: action.payload,
            };

        case 'SUBMIT_ANSWER':
            return {
                ...state,
                feedback: {
                    show: true,
                    correct: action.payload.isCorrect,
                    message: action.payload.message,
                },
            };

        case 'CONTINUE_TO_NEXT':
            return {
                ...state,
                progress: action.payload.progress,
                feedback: null,
                userAnswer: '',
            };

        case 'CLEAR_FEEDBACK':
            return {
                ...state,
                feedback: null,
            };

        case "SAVE_SETTINGS":
            return {
                ...state,
                settings: action.payload.settings
            }

        case 'RESET':
            return {
                ...initialState,
                isSetupComplete: false,
            };

        default:
            return state;
    }
}

const initialState: QuizState = {
    progress: null,
    settings: null,
    currentVocab: null,
    userAnswer: '',
    feedback: null,
    isLoadingVocab: false,
    isSetupComplete: false,
};

interface QuizContextValue {
    state: QuizState;

    actions: {
        setupComplete: (SetupValues) => void;
        setAnswer: (answer: string) => void;
        submitAnswer: () => void;
        continueToNext: () => Promise<void>;
        reset: () => void;
    };

    computed: {
        canSubmit: boolean;
        canContinue: boolean;
        isReady: boolean;
    };
}

export interface SetupValues {
    kanjiKnowledge: KanjiKnowledge
    settings: UserSettings
}

export interface SetupCompleteValues {
    progress: UserProgress,
    settings: UserSettings
}


const QuizContext = createContext<QuizContextValue | null>(null);

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(quizReducer, {
        ...initialState,
        progress: StorageService.loadProgress(),
        settings: StorageService.loadSettings() ?? DEFAULT_SETTINGS,
        isSetupComplete: !!StorageService.loadProgress(),
    });

    // Auto-save progress
    useEffect(() => {
        if (state.progress) {
            StorageService.saveProgress(state.progress);
        }
    }, [state.progress]);

    useEffect(() => {
        if (state.settings) {
            StorageService.saveSettings(state.settings);
        }
    }, [state.settings]);

    // Auto-load vocabulary when queue changes
    useEffect(() => {
        const vocabId = state.progress?.activeQueue[0]?.vocabId;

        if (!vocabId) {
            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: null as any });
            return;
        }

        dispatch({ type: 'LOAD_VOCAB_START' });

        let isMounted = true;
        VocabularyService.loadVocab(vocabId).then(vocab => {
            if (isMounted) {
                dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: vocab });
            }
        });

        return () => {
            isMounted = false;
        };
    }, [state.progress?.activeQueue[0]?.vocabId]);

    // Auto-advance on correct answer
    useEffect(() => {
        if (state.feedback?.correct) {
            const timer = setTimeout(() => {
                actions.continueToNext().then();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);

            return () => clearTimeout(timer);
        }
    }, [state.feedback?.correct]);

    const actions: QuizContextValue['actions'] = {
        async setupComplete(values: SetupValues) {
            const newProgress: UserProgress = {
                kanjiKnowledge: values.kanjiKnowledge,
                activeQueue: [],
                learnedWords: new Set(),
                stats: {
                    totalLearned: 0,
                    totalReviews: 0,
                },
            };

            newProgress.activeQueue = await SRSService.fillQueue(
                [],
                values.kanjiKnowledge,
                newProgress.learnedWords,
                values.settings
            );

            const setup: SetupCompleteValues = {
                settings: values.settings,
                progress: newProgress
            }

            dispatch({ type: 'SETUP_COMPLETE', payload: setup });
        },

        setAnswer(answer: string) {
            dispatch({ type: 'SET_ANSWER', payload: answer });
        },

        submitAnswer() {
            if (!state.currentVocab || state.feedback?.show) return;

            const isCorrect = QuizService.validateAnswer(
                state.userAnswer,
                state.currentVocab.readings
            );

            dispatch({
                type: 'SUBMIT_ANSWER',
                payload: {
                    isCorrect,
                    message: isCorrect ? 'Correct.' : 'Incorrect.',
                },
            });
        },

        async continueToNext() {
            if (!state.progress || !state.feedback) return;

            const { queue, graduatedVocabId } = SRSService.applyAnswer(
                state.progress.activeQueue,
                0,
                state.feedback.correct
            );

            const learnedWords = graduatedVocabId
                ? new Set([...state.progress.learnedWords, graduatedVocabId])
                : state.progress.learnedWords;

            const filledQueue = await SRSService.cleanupAndRefill(
                queue,
                state.progress.kanjiKnowledge,
                learnedWords,
                state.settings!
            );

            const updatedProgress: UserProgress = {
                ...state.progress,
                activeQueue: filledQueue,
                learnedWords,
                stats: {
                    ...state.progress.stats,
                    totalReviews: state.progress.stats.totalReviews + 1,
                    totalLearned: graduatedVocabId
                        ? state.progress.stats.totalLearned + 1
                        : state.progress.stats.totalLearned,
                },
            };

            dispatch({ type: 'CONTINUE_TO_NEXT', payload: { progress: updatedProgress } });
        },

        reset() {
            StorageService.clearProgress();
            dispatch({ type: 'RESET' });
        },
    };

    const computed: QuizContextValue['computed'] = {
        canSubmit: !!(
            state.userAnswer.trim() &&
            state.currentVocab &&
            !state.feedback?.show &&
            !state.isLoadingVocab
        ),
        canContinue: !!(state.feedback?.show && !state.feedback.correct),
        isReady: !!(state.currentVocab && !state.isLoadingVocab),
    };

    return (
        <QuizContext.Provider value={{ state, actions, computed }}>
            {children}
        </QuizContext.Provider>
    );
};

export const useQuiz = () => {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error('useQuiz must be used within QuizProvider');
    }
    return context;
};