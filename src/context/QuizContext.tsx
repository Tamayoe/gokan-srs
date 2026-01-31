// src/context/QuizContext.tsx
import React, {
    useEffect,
    useMemo,
    useReducer,
    useState,
    useRef,
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
import type { AnswerResult } from '../services/srs.service';


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
        correct: boolean; // Keep for compatibility/easy checks (true if correct or minor_error?) -> No, strict correct.
        type: AnswerResult;
        message: string;
        matchedAnswer: string;
    } | null;
    isLoadingVocab: boolean;
    introCandidates: Vocabulary[]; // [NEW] Potential new items, not yet in learningQueue
    sessionHistory: Array<{        // [NEW] History for the current session
        vocabId: string;
        writtenForm: string;
        result: AnswerResult;
        delta: number;
    }>;
    fatalError: string | null;
}

type QuizAction =
    | { type: 'SETUP_COMPLETE'; payload: SetupCompleteValues }
    | { type: 'LOAD_VOCAB_START' }
    | { type: 'LOAD_VOCAB_SUCCESS'; payload: Vocabulary | null }
    | { type: 'LOAD_VOCAB_ERROR'; payload: { vocabId: string, error: any } }
    | { type: 'SET_ANSWER'; payload: string }
    | { type: 'SUBMIT_ANSWER'; payload: { type: AnswerResult; message: string; matchedAnswer: string } }
    | { type: 'SUBMIT_ANSWER'; payload: { type: AnswerResult; message: string; matchedAnswer: string } }
    | { type: 'UPDATE_AFTER_ANSWER'; payload: { progress: UserProgress; historyItem: { vocabId: string, writtenForm: string, result: AnswerResult, delta: number } } }
    | { type: 'ADVANCE_QUEUE'; payload: { progress: UserProgress, candidates?: Vocabulary[] } }
    | { type: 'CLEAR_FEEDBACK' }
    | { type: 'UPDATE_KANJI_KNOWLEDGE'; payload: KanjiKnowledge }
    | { type: 'SAVE_SETTINGS'; payload: UserSettings }
    | { type: 'OVERRIDE_DAILY_LIMIT' }
    | { type: 'RESET' }
    | { type: 'VOCAB_INTRO_CHOICE'; vocabId: string; choice: 'learn' | 'skip'; }
    | { type: 'RESET_DAILY_STATS' };

const initialState: QuizState = {
    progress: null,
    settings: null,
    currentVocab: null,
    userAnswer: '',
    feedback: null,
    isLoadingVocab: false,
    introCandidates: [],
    sessionHistory: [],
    fatalError: null,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
    switch (action.type) {
        case 'SETUP_COMPLETE':
            return {
                ...state,
                progress: action.payload.progress,
                settings: action.payload.settings,
            };

        case 'RESET_DAILY_STATS':
            if (!state.progress) return state;
            return {
                ...state,
                progress: {
                    ...state.progress,
                    stats: {
                        ...state.progress.stats,
                        newLearnedToday: 0,
                    },
                    dailyOverride: false,
                },
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

        case 'LOAD_VOCAB_ERROR':
            console.error(`[QuizContext] CRITICAL: Failed to load vocab ${action.payload.vocabId}`, action.payload.error);
            return {
                ...state,
                isLoadingVocab: false,
                fatalError: `Failed to load vocabulary data for ID: ${action.payload.vocabId}. The application data may be corrupted. Please reload or contact support.`,
            };

        case 'SET_ANSWER':
            return { ...state, userAnswer: action.payload };

        case 'SUBMIT_ANSWER':
            return {
                ...state,
                feedback: {
                    show: true,
                    correct: action.payload.type === 'correct',
                    type: action.payload.type,
                    message: action.payload.message,
                    matchedAnswer: action.payload.matchedAnswer
                },
            };

        case 'UPDATE_AFTER_ANSWER':
            return {
                ...state,
                progress: action.payload.progress,
                feedback: null,
                userAnswer: '',
                sessionHistory: [action.payload.historyItem, ...state.sessionHistory].slice(0, 50),
            };

        case 'ADVANCE_QUEUE':
            return {
                ...state,
                progress: action.payload.progress,
                introCandidates: action.payload.candidates ?? state.introCandidates,
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

            // Create new VocabProgress and APPEND to queue
            const newProgressItem = SRSService.createVocabProgress(action.vocabId);
            const processedItem = SRSService.applyVocabIntroChoice(newProgressItem, action.choice);

            return {
                ...state,
                progress: {
                    ...state.progress,
                    learningQueue: [...state.progress.learningQueue, processedItem]
                },
                // Remove from candidates
                introCandidates: state.introCandidates.filter(c => c.id !== action.vocabId),
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

    const startTimeRef = useRef<number | null>(null);

    /* ---------- Derived ---------- */

    // Check Day Boundary using LocalStorage
    useEffect(() => {
        // Only run if we have progress loaded
        if (state.progress) {
            const lastAccessKey = 'GOKAN_LAST_ACCESS_DATE';
            const lastAccess = localStorage.getItem(lastAccessKey);
            const now = new Date();
            const today = now.toDateString();

            if (lastAccess !== today) {
                console.log(`[QuizContext] New day detected! Resetting daily stats. Last: ${lastAccess}, Today: ${today}`);
                dispatch({ type: 'RESET_DAILY_STATS' });
                localStorage.setItem(lastAccessKey, today);
            }
        }
    }, [state.progress ? 'loaded' : 'loading']); // Run once when progress loads


    const nextDue = useMemo(
        () => {
            // Priority 1: Due Reviews & Retries from Queue
            const reviewItem = getNextVocabToStudy(state.progress?.learningQueue);
            if (reviewItem) return reviewItem;

            // Priority 2: Intro Candidates
            // We use the computed sessionView logic to know if we are in 'learn' mode.
            const view = computeSessionView(state.progress, state.settings, false);

            if (view.sessionState === 'learn' && state.introCandidates.length > 0) {
                return { vocabId: state.introCandidates[0].id };
            }

            return null;
        },
        [state.progress?.learningQueue, state.settings, state.introCandidates]
    );

    const currentProgress = useMemo(() => {
        if (!state.currentVocab || !state.progress) return null;

        return state.progress.learningQueue.find(
            v => v.vocabId === state.currentVocab?.id
        ) ?? null;
    }, [state.currentVocab, state.progress]);

    const [hasMoreLearnable, setHasMoreLearnable] = useState(false); // Keep for "exhausted" check

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

            const evaluation = SRSService.evaluateAnswer(
                state.userAnswer,
                state.currentVocab.reading
            );

            let message = 'Incorrect.';
            if (evaluation.result === 'correct') message = 'Correct.';
            else if (evaluation.result === 'minor_error') message = 'Close.';

            dispatch({
                type: 'SUBMIT_ANSWER',
                payload: {
                    type: evaluation.result,
                    message,
                    matchedAnswer: evaluation.matchedAnswer
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


            // [MODIFIED] If we have NO due reviews, and we CAN add new items, fetch candidates
            // but DO NOT add to learningQueue yet.
            const needsCandidates = canAddNew && state.introCandidates.length === 0;

            let newCandidates: Vocabulary[] = [];
            let finalQueue = updatedQueue;

            if (needsCandidates) {
                const candidateIds = await SRSService.getNextCandidates(
                    updatedQueue,
                    state.progress!.kanjiKnowledge,
                    state.settings!,
                    CONSTANTS.srs.newVocabBatchSize
                );

                // Load the actual Vocabulary objects
                for (const id of candidateIds) {
                    try {
                        const vocab = await VocabularyService.loadVocab(id);
                        if (vocab) newCandidates.push(vocab);
                    } catch (e) {
                        console.error(`Failed to load candidate ${id}`, e);
                    }
                }
            } else if (!canAddNew && state.introCandidates.length > 0) {
                // If we shouldn't add new ones (limit reached?), maybe clear candidates?
                // Or just keep them buffered. Keeping is fine.
            }

            // [MODIFIED] refillQueue is no longer used here to modify the queue directly for new items.
            // However, we still might want to call it if we needed to refill *reviews*? 
            // No, reviews are time-based. "Refill" was only for fresh content.
            // So we skip SRSService.refillQueue entirely if we are using the new system.
            // Wait - Setup might populate queue initially? 
            // In setupComplete we used refillQueue. Here we are in the loop.

            dispatch({
                type: "ADVANCE_QUEUE",
                payload: {
                    progress: {
                        ...state.progress!,
                        learningQueue: finalQueue,
                    },
                    candidates: newCandidates.length > 0 ? newCandidates : undefined
                },
            });
        },

        async continueToNext() {
            if (!state.progress || !state.feedback || !state.currentVocab) return;

            const now = new Date();
            const id = state.currentVocab.id;
            const latency = startTimeRef.current ? now.getTime() - startTimeRef.current : 5000;

            // We need to find the specific item again to calculate delta for dispatch
            const target = state.progress.learningQueue.find(v => v.vocabId === id);
            let historyItem = null;

            if (target) {
                const { updated } = SRSService.applyAnswer(
                    target,
                    state.userAnswer,
                    state.feedback!.matchedAnswer,
                    latency,
                    now,
                    state.feedback!.type
                );

                const delta = updated.reading.memoryStrength - target.reading.memoryStrength;

                historyItem = {
                    vocabId: id,
                    writtenForm: state.currentVocab.writtenForm.kanji, // Use kanji string
                    result: state.feedback!.type,
                    delta: delta
                };
            }

            const updatedQueue = state.progress.learningQueue.map(v => {
                if (v.vocabId !== id) return v;

                const { updated } = SRSService.applyAnswer(
                    v,
                    state.userAnswer,
                    state.feedback!.matchedAnswer, // Use the matched answer we found during submit
                    latency,
                    now,
                    state.feedback!.type // Pass the already calculated result
                );

                return updated;
            });

            dispatch({
                type: "UPDATE_AFTER_ANSWER",
                payload: {
                    progress: {
                        ...state.progress,
                        learningQueue: updatedQueue,
                        stats: {
                            ...state.progress.stats,
                            totalReviews: state.progress.stats.totalReviews + 1,
                        },
                    },
                    historyItem: historyItem!
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

        async saveVocabIntroChoice(vocabulary: Vocabulary, choice: "learn" | "skip") {
            // [MODIFIED] Here we actually CREATE the VocabProgress and add it to the queue
            if (!state.progress) return;

            // We handle the creation in the reducer to keep action pure-ish (though creates date there)
            // Just dispatch the choice.

            // Add to end of queue
            // We use functional update in reducer, but here we pass the ID.
            // Wait, Reducer expects VOCAB_INTRO_CHOICE with vocabId. 
            // In the reducer we were mapping over existing queue. 
            // But now the item is NOT in the queue yet.
            // We need to change the reducer logic for this too.
            // Actually, simply dispatch(VOCAB_INTRO_CHOICE) is enough IF we handle the "Add to queue" in reducer.
            // See reducer change above: it filters candidates. It needs to append to queue.

            // Wait, previous reducer change:
            // ...learningQueue: state.progress.learningQueue.map(...)
            // This assumes it was in the queue. 
            // We need to FIX the reducer to APPEND, not map.

            // Reducer Fix logic is complex to inline in replacement. 
            // Let's rely on the dispatch and fix reducer logic in a separate block or verify.
            // The reducer block I replaced earlier was:
            /*
                progress: {
                    ...state.progress,
                    learningQueue: state.progress.learningQueue.map(...) // OLD
                }
            */
            // I replaced it with just filter candidates. 
            // I missed the "Add to queue" part in the reducer replacement! 
            // I need to add that logic.

            // Since this is `saveVocabIntroChoice` function modification, 
            // I will correct the reducer in a subsequent replacement or try to fix it here if possible?
            // No, separate tool call for safety if I messed up the reducer chunk.
            // Actually I can fix the reducer in a separate chunk in this same call if I target the same lines?
            // No, overlapping edits.

            // I will implement the dispatch here.

            dispatch({
                type: 'VOCAB_INTRO_CHOICE',
                choice: choice,
                vocabId: vocabulary.id
            });

            // Force Advance to ensure we move on? 
            // The state change should trigger re-render and re-eval of nextDue.
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
            const timer = setTimeout(() => {
                sync().catch(console.error);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [state.progress, isAuthenticated]);

    /* ---------- Load vocab ---------- */

    useEffect(() => {
        if (!nextDue) {
            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: null });

            // AUTO-ADVANCE TRIGGER: If queue is empty but we can introduce new vocab, refill
            if (state.progress && state.settings && sessionView.sessionState === 'learn') {
                const now = new Date();
                actions.advanceQueue({ now });
            }
            return;
        }

        dispatch({ type: 'LOAD_VOCAB_START' });

        let alive = true;

        VocabularyService.loadVocab(nextDue.vocabId).then(vocab => {
            if (alive) {
                dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: vocab });
                startTimeRef.current = Date.now();
            }
        }).catch(err => {
            if (alive) {
                dispatch({ type: 'LOAD_VOCAB_ERROR', payload: { vocabId: nextDue.vocabId, error: err } });
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
