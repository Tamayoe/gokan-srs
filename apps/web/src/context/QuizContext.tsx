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
} from '@gokan-srs/core/models/user.model';
import type { VocabProgress, Vocabulary } from '@gokan-srs/core/models/vocabulary.model';
import type { Sentence } from '@gokan-srs/core/models/sentence.model';
import { StorageService } from '@gokan-srs/core/services/storage.service';
import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { SRSService } from '@gokan-srs/core/services/srs.service';
import { MigrationService } from '@gokan-srs/core/services/migration.service';
import type { AnswerResult } from '@gokan-srs/core/services/srs.service';
import { LLMService } from '@gokan-srs/core/services/llm.service';



import { CONSTANTS } from '@gokan-srs/core/commons/constants';
import { DEFAULT_SETTINGS } from '@gokan-srs/core/models/user.model';
import { computeSessionView } from '@gokan-srs/core/utils/quiz.utils';
import type { SetupCompleteValues, SetupValues } from "@gokan-srs/core/models/state.model";
import { getNextVocabToStudy, calculateMasteryPercentage } from "@gokan-srs/core/utils/srs.utils";
import type { QuizItem, QuizType, QuizMode } from "@gokan-srs/core/utils/srs.utils";
import { QuizContext } from "./useQuiz";
import { useGoogleDrive } from "./GoogleDriveContext";

/* =========================
   STATE & TYPES
   ========================= */

// Union type for items we are about to study (Queue Item OR Intro Candidate)
type PendingQuizItem = QuizItem | { vocabId: string; quizType: QuizType; quizMode: QuizMode; vocab?: undefined };

interface QuizState {
    progress: UserProgress | null;
    settings: UserSettings | null;
    currentVocab: Vocabulary | null;
    currentSentences: Sentence[] | null; // [NEW] Sentences for meaning quiz
    currentSentenceId: string | null; // [NEW] Selected sentence ID for persistence
    currentQuizItem: PendingQuizItem | null; // [NEW] Track what we are testing
    userAnswer: string;
    feedback: {
        show: boolean;
        correct: boolean; // Keep for compatibility/easy checks (true if correct or minor_error?) -> No, strict correct.
        type: AnswerResult;
        message: string;
        matchedAnswer: string;
    } | null;
    isLoadingVocab: boolean;
    isEvaluatingAi: boolean; // [RESTORED] Track AI evaluation state
    introCandidates: Vocabulary[]; // [RESTORED] Potential new items, not yet in learningQueue
    sessionQueue: PendingQuizItem[]; // [NEW] Locked queue for the active session
    sessionBuiltAt: number | null; // [NEW] timestamp of session start
    nextKanjiToLearn: { step: number; kanjis: string[] } | null; // [NEW] Next kanji to unlock
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
    | { type: 'LOAD_VOCAB_START'; payload: PendingQuizItem }
    | { type: 'LOAD_VOCAB_SUCCESS'; payload: { vocab: Vocabulary | null; sentences: Sentence[] | null; selectedSentenceId: string | null } }
    | { type: 'LOAD_VOCAB_ERROR'; payload: { vocabId: string, error: any } }
    | { type: 'EVALUATING_AI_START' }
    | { type: 'SET_ANSWER'; payload: string }
    | { type: 'SUBMIT_ANSWER'; payload: { type: AnswerResult; message: string; matchedAnswer: string } }
    | { type: 'UPDATE_AFTER_ANSWER'; payload: { progress: UserProgress; historyItem: { vocabId: string, writtenForm: string, result: AnswerResult, delta: number } } }
    | { type: 'ADVANCE_QUEUE'; payload: { progress: UserProgress, candidates?: Vocabulary[] } }
    | { type: 'CLEAR_FEEDBACK' }
    | { type: 'UPDATE_KANJI_KNOWLEDGE'; payload: KanjiKnowledge }
    | { type: 'SAVE_SETTINGS'; payload: UserSettings }
    | { type: 'OVERRIDE_DAILY_LIMIT' }
    | { type: 'RESET' }
    | { type: 'VOCAB_INTRO_CHOICE'; vocabId: string; choice: 'learn' | 'skip'; }
    | { type: 'SET_NEXT_KANJI'; payload: { step: number; kanjis: string[] } | null; }
    | { type: 'LEARN_NEXT_KANJI'; payload: UserProgress }
    | { type: 'BUILD_SESSION_QUEUE'; payload: { queue: PendingQuizItem[]; builtAt: number } }
    | { type: 'SHIFT_SESSION_QUEUE' }
    | { type: 'APPEND_TO_SESSION_QUEUE'; payload: PendingQuizItem }
    | { type: 'RESET_DAILY_STATS' };

const initialState: QuizState = {
    progress: null,
    settings: null,
    currentVocab: null,
    currentSentences: null,
    currentSentenceId: null,
    currentQuizItem: null,
    userAnswer: '',
    feedback: null,
    isLoadingVocab: false,
    isEvaluatingAi: false,
    introCandidates: [],
    sessionQueue: [],
    sessionBuiltAt: null,
    nextKanjiToLearn: null,
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
                currentQuizItem: action.payload, // [NEW] Set the item
                currentSentences: null, // Reset sentences
                currentSentenceId: null, // Reset selected sentence
                userAnswer: '',
                feedback: null,
            };

        case 'LOAD_VOCAB_SUCCESS':
            return {
                ...state,
                currentVocab: action.payload.vocab,
                currentSentences: action.payload.sentences,
                currentSentenceId: action.payload.selectedSentenceId,
                isLoadingVocab: false,
            };

        case 'SET_NEXT_KANJI':
            return {
                ...state,
                nextKanjiToLearn: action.payload
            };

        case 'BUILD_SESSION_QUEUE':
            return {
                ...state,
                sessionQueue: action.payload.queue,
                sessionBuiltAt: action.payload.builtAt
            };

        case 'SHIFT_SESSION_QUEUE':
            return {
                ...state,
                sessionQueue: state.sessionQueue.slice(1)
            };

        case 'APPEND_TO_SESSION_QUEUE':
            // Insert randomly into the remaining queue so retries aren't back-to-back
            const remaining = [...state.sessionQueue];
            let insertPos = 0;
            if (remaining.length > 0) {
                // If only 1 item left, it will just append. Otherwise random insert anywhere after the immediate next item.
                insertPos = remaining.length <= 1 ? remaining.length : Math.floor(Math.random() * (remaining.length - 1)) + 1;
            }
            remaining.splice(insertPos, 0, action.payload);

            return {
                ...state,
                sessionQueue: remaining
            };

        case 'LEARN_NEXT_KANJI':
            return {
                ...state,
                progress: action.payload,
                nextKanjiToLearn: null
            };

        case 'LOAD_VOCAB_ERROR':
            console.error(`[QuizContext] CRITICAL: Failed to load vocab ${action.payload.vocabId}`, action.payload.error);
            return {
                ...state,
                isLoadingVocab: false,
                fatalError: `Failed to load vocabulary data for ID: ${action.payload.vocabId}. The application data may be corrupted. Please reload or contact support.`,
            };

        case 'EVALUATING_AI_START':
            return { ...state, isEvaluatingAi: true };

        case 'SET_ANSWER':
            return { ...state, userAnswer: action.payload };

        case 'SUBMIT_ANSWER':
            return {
                ...state,
                isEvaluatingAi: false,
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
                sessionQueue: state.sessionQueue.slice(1), // Remove the answered item
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
            console.debug('[QuizContext] Updating Kanji knowledge', action.payload);
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

            // Check if item already exists in queue to avoid duplicates
            const existingIndex = state.progress.learningQueue.findIndex(v => v.vocabId === action.vocabId);
            let updatedQueue;

            if (existingIndex >= 0) {
                // Update existing
                updatedQueue = [...state.progress.learningQueue];
                updatedQueue[existingIndex] = {
                    ...updatedQueue[existingIndex],
                    ...processedItem,
                    // Preserve history if any (though new items shouldn't have history)
                    reading: { ...processedItem.reading, history: updatedQueue[existingIndex].reading.history },
                    meaning: { ...processedItem.meaning, history: updatedQueue[existingIndex].meaning.history },
                };
            } else {
                // Append new
                updatedQueue = [...state.progress.learningQueue, processedItem];
            }

            const newState = {
                ...state,
                progress: {
                    ...state.progress,
                    learningQueue: updatedQueue,
                    stats: {
                        ...state.progress.stats,
                        newLearnedToday: state.progress.stats.newLearnedToday + (action.choice === 'learn' ? 1 : 0),
                        totalLearned: state.progress.stats.totalLearned + 1,
                    }
                },
                // Remove from candidates
                introCandidates: state.introCandidates.filter(c => c.id !== action.vocabId),
            };
            return newState;
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
        submitAnswer(): Promise<void>;
        advanceQueue({ now, overrideDailyLimit }: { now: Date, overrideDailyLimit?: boolean }): void;
        continueToNext(): Promise<void>;
        saveSettings(settings: UserSettings): void;
        updateKanjiKnowledge(knowledge: KanjiKnowledge): void;
        overrideDailyLimit(): Promise<void>;
        saveVocabIntroChoice(vocabulary: Vocabulary, choice: 'learn' | 'skip'): void
        learnNextKanji(): Promise<void>;
        buildSessionQueue(now: Date): void;
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
    const {
        logout,
        uploadProgress,
        isDownloading,
        lastDownloadTime
    } = useGoogleDrive();

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

    // Run V4/V5 Async Migration
    useEffect(() => {
        if (state.progress && MigrationService.needsMigration(state.progress)) {
            console.log('[QuizContext] Migration needed. Fetching merged-map and applying...');
            MigrationService.migrateMergedVocabsAsync(state.progress).then(updatedProgress => {
                if (updatedProgress !== state.progress) {
                    dispatch({
                        type: 'SETUP_COMPLETE',
                        payload: {
                            progress: updatedProgress,
                            settings: state.settings!
                        }
                    });
                    // IMPORTANT: We must persist to localStorage immediately to avoid 
                    // dropping the version bump if the user closes/refreshes before any learning action.
                    StorageService.saveProgress(updatedProgress);
                    console.log('[QuizContext] Migration to unified vocabs complete and saved to storage.');
                }
            });
        }
    }, [state.progress ? 'loaded' : 'loading']); // Run once when progress loads


    const nextDue = useMemo(
        (): PendingQuizItem | null => { // [UPDATED] Return PendingQuizItem
            // Priority 1: Intro Candidates (Finish the batch first!)
            // We check if we are allowed to learn new items (daily limit)
            const dailyLimitReached = false; // Limit removed

            console.log(`[QuizContext] nextDue calculation:
                introCandidates: ${state.introCandidates.length},
                dailyLimitReached: ${dailyLimitReached}
            `);

            if (!dailyLimitReached && state.introCandidates.length > 0) {
                // Intros default to Reading quiz ('base' mode), with explicit vocabId
                console.log(`[QuizContext] nextDue -> Priority 1: Intro ${state.introCandidates[0].id}`);
                return { vocabId: state.introCandidates[0].id, quizType: 'reading', quizMode: 'base' };
            }

            // Priority 2: Due Reviews & Retries from Queue
            // getNextVocabToStudy now returns QuizItem | null
            const reviewItem = getNextVocabToStudy(
                state.progress?.learningQueue,
                state.settings ?? undefined // Pass settings (default handled in utils if undefined, but state.settings is UserSettings | null)
            );
            if (reviewItem) {
                console.log(`[QuizContext] nextDue -> Priority 2: Review ${reviewItem.vocab.vocabId} (${reviewItem.quizType})`);
                return reviewItem;
            }

            console.log(`[QuizContext] nextDue -> NULL`);
            return null;
        },
        [state.progress, state.settings, state.introCandidates]
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
                hasMoreLearnable,
                !!state.nextKanjiToLearn,
                state.introCandidates.length > 0
            ),
        [state.progress, state.settings, hasMoreLearnable, state.nextKanjiToLearn, state.introCandidates.length]
    );

    /* =========================
       ACTIONS
       ========================= */

    const actions: QuizContextValue['actions'] = {
        async setupComplete({ kanjiKnowledge, settings }) {
            const progress: UserProgress = {
                kanjiKnowledge,
                learningQueue: [], // Start empty, let the intro system fill it
                stats: {
                    newLearnedToday: 0,
                    totalLearned: 0,
                    totalReviews: 0,
                },
                dailyOverride: false,
                adaptive: {
                    level: 1.0,
                    history: []
                }
            };

            dispatch({
                type: 'SETUP_COMPLETE',
                payload: { progress, settings },
            });
        },

        setAnswer(answer) {
            dispatch({ type: 'SET_ANSWER', payload: answer });
        },

        async submitAnswer() {
            if (!state.currentVocab || state.feedback?.show || !state.currentQuizItem || state.isEvaluatingAi) return;

            const quizType = state.currentQuizItem.quizType;
            let result: AnswerResult;
            let matchedAnswer: string;
            let message = 'Incorrect.';

            if (quizType === 'reading') {
                const evaluation = SRSService.evaluateAnswer(
                    state.userAnswer,
                    state.currentVocab.reading
                );
                result = evaluation.result;
                matchedAnswer = evaluation.matchedAnswer;
            } else {
                // MEANING EVALUATION
                const meanings = state.currentVocab.senses.flatMap(s => s.glosses);
                const evaluation = SRSService.evaluateMeaning(
                    state.userAnswer,
                    meanings
                );
                result = evaluation.result;
                matchedAnswer = evaluation.matchedAnswer;

                // [NEW] Gemini API Contextual Validation
                // Trigger AI evaluation ONLY if the mode is 'context'
                if (quizType === 'meaning' && state.currentQuizItem.quizMode === 'context' &&
                    state.settings?.geminiApiKey &&
                    state.currentSentenceId &&
                    state.currentSentences &&
                    state.userAnswer.trim().length > 0) {

                    // If alwaysUseAiForMeaningContext is TRUE, we evaluate ALL answers, even if strict check says correct.
                    // If FALSE, we only evaluate if the strict check says wrong or minor_error (original behavior).
                    const shouldEvaluate = state.settings.alwaysUseAiForMeaningContext ||
                        (result === 'wrong' || result === 'minor_error');

                    if (shouldEvaluate) {
                        const sentence = state.currentSentences.find(s => s.id === state.currentSentenceId);

                        if (sentence) {
                            try {
                                dispatch({ type: 'EVALUATING_AI_START' });

                                const aiEvaluation = await LLMService.validateMeaningContext(
                                    state.settings.geminiApiKey,
                                    state.currentVocab,
                                    sentence,
                                    state.userAnswer
                                );

                                if (aiEvaluation.result === 'correct' || aiEvaluation.result === 'minor_error') {
                                    result = aiEvaluation.result;
                                    // We overwrite the matched answer internally so SRSService stores the user's explicit accepted answer
                                    matchedAnswer = state.userAnswer;
                                    message = result === 'correct'
                                        ? `Correct. (AI Validated: ${aiEvaluation.reason})`
                                        : `Close. ${aiEvaluation.reason}`;
                                } else {
                                    // If AI says it's wrong:
                                    result = 'wrong';
                                    if (aiEvaluation.reason) {
                                        message = `Incorrect. (AI: ${aiEvaluation.reason})`;
                                    }
                                }
                            } catch (e) {
                                console.error("[QuizContext] AI Evaluation failed, falling back to strict result.", e);
                                // Fallback to strict evaluation already computed
                            }
                        }
                    }
                }
            }

            if (result === 'correct' && !message.includes('AI Validated')) message = 'Correct.';
            else if (result === 'minor_error' && !message.includes('Close.')) message = 'Close.';

            dispatch({
                type: 'SUBMIT_ANSWER',
                payload: {
                    type: result,
                    message,
                    matchedAnswer
                },
            });
        },

        async advanceQueue({
            now,
            // @ts-ignore - Kept for API compatibility but no longer used since limits are removed
            overrideDailyLimit = false,
        }) {
            const updatedQueue = state.progress!.learningQueue

            const nowDueCount = updatedQueue.filter(
                v => v.nextReviewAt && v.nextReviewAt <= now
            ).length;

            const canAddNew =
                nowDueCount === 0 &&
                sessionView.sessionState !== "waiting";


            // [MODIFIED] If we have NO due reviews, and we CAN add items...
            const needsCandidates = canAddNew && state.introCandidates.length === 0;

            const newCandidates: Vocabulary[] = [];
            const finalQueue = updatedQueue;

            if (needsCandidates) {
                // IMPORTANT: Exclude current introCandidates from search to avoid duplicates
                const currentCandidateIds = new Set(state.introCandidates.map(c => c.id));
                const maxToFind = CONSTANTS.srs.newVocabBatchSize - state.introCandidates.length;

                const candidateIds = await SRSService.getNextCandidates(
                    updatedQueue,
                    state.progress!.kanjiKnowledge,
                    state.settings!,
                    maxToFind,
                    currentCandidateIds // Pass as ignoredIds
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
                console.log(`[QuizContext] advanceQueue found ${newCandidates.length} new candidates.`);

                // [BUGFIX] Prevent infinite loading loop if files are missing but listed in the index
                if (candidateIds.length > 0 && newCandidates.length === 0) {
                    console.error("[QuizContext] CRITICAL ERROR: Found candidates in index, but ALL failed to load. Aborting queue advance.", { candidateIds });
                    dispatch({
                        type: 'LOAD_VOCAB_ERROR',
                        payload: { vocabId: candidateIds[0], error: new Error('Candidate vocabulary files could not be loaded. Data might be corrupted or out-of-sync.') }
                    });
                    return;
                }
            }

            // [NEW] If no candidates found, and we are not exhausted/at limit, prepare next kanji natively
            if (newCandidates.length === 0 && canAddNew && state.progress!.kanjiKnowledge.method === 'kklc') {
                try {
                    const kanjiIndex = await VocabularyService.loadKKLCKanjiIndex();
                    if (kanjiIndex) {
                        const nextStep = state.progress!.kanjiKnowledge.step + 1;
                        if (kanjiIndex[nextStep]) {
                            dispatch({
                                type: 'SET_NEXT_KANJI',
                                payload: { step: nextStep, kanjis: kanjiIndex[nextStep] }
                            });
                        }
                    }
                } catch (e) {
                    console.error("[QuizContext] Failed to load kanji index for next step", e);
                }
            } else if (newCandidates.length > 0 && state.nextKanjiToLearn) {
                // Clear next kanji if we actually found candidates
                dispatch({ type: 'SET_NEXT_KANJI', payload: null });
            }

            dispatch({
                type: "ADVANCE_QUEUE",
                payload: {
                    progress: {
                        ...state.progress!,
                        learningQueue: finalQueue,
                    },
                    candidates: newCandidates.length > 0
                        ? [...state.introCandidates, ...newCandidates] // Append to existing
                        : undefined
                },
            });
        },

        async continueToNext() {
            if (!state.progress || !state.feedback || !state.currentVocab || !state.currentQuizItem) return;

            const now = new Date();
            const id = state.currentVocab.id;
            const latency = startTimeRef.current ? now.getTime() - startTimeRef.current : 5000;

            // We need to find the specific item again to calculate delta for dispatch
            const target = state.progress.learningQueue.find(v => v.vocabId === id);
            let historyItem = null;

            // [NEW] Adaptive SRS Update
            const currentAdaptive = state.progress.adaptive || { level: 1.0, history: [] };
            const newAdaptive = SRSService.updateAdaptiveStats(currentAdaptive, state.feedback!.type);
            const adaptiveLevel = newAdaptive.level;

            // [NEW] Frequency Modifier
            const frequencySetting = state.settings!.learningFrequency;
            const frequencyModifier = CONSTANTS.srs.frequencyMultipliers[frequencySetting];

            if (target) {
                const { updated } = SRSService.applyAnswer(
                    target,
                    state.currentQuizItem.quizType, // [UPDATED] Use real type
                    state.currentQuizItem.quizMode, // [NEW] Pass quiz mode
                    state.userAnswer,
                    state.feedback!.matchedAnswer,
                    latency,
                    now,
                    state.feedback!.type,
                    adaptiveLevel, // [NEW] Pass adaptive level
                    frequencyModifier // [NEW] Pass frequency modifier
                );

                // Delta calculation depends on type
                const oldStrength = state.currentQuizItem.quizType === 'reading'
                    ? target.reading.memoryStrength
                    : target.meaning.memoryStrength;

                const newStrength = state.currentQuizItem.quizType === 'reading'
                    ? updated.reading.memoryStrength
                    : updated.meaning.memoryStrength;

                const oldMastery = calculateMasteryPercentage(oldStrength);
                const newMastery = calculateMasteryPercentage(newStrength);
                const delta = newMastery - oldMastery;

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
                    state.currentQuizItem!.quizType, // [UPDATED] Use real type
                    state.currentQuizItem!.quizMode, // [NEW] Pass quiz mode
                    state.userAnswer,
                    state.feedback!.matchedAnswer, // Use the matched answer we found during submit
                    latency,
                    now,
                    state.feedback!.type, // Pass the already calculated result
                    adaptiveLevel, // [NEW] Pass adaptive level
                    frequencyModifier // [NEW] Pass frequency modifier
                );

                return updated;
            });

            // If they got it wrong, explicitly re-insert into the sessionQueue via APPEND
            // The actual removal from queue is handled by the UPDATE_AFTER_ANSWER slice
            if (!state.feedback.correct) {
                dispatch({
                    type: "APPEND_TO_SESSION_QUEUE",
                    payload: state.currentQuizItem
                });
            }

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
                        adaptive: newAdaptive, // [NEW] Persist adaptive stats
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
            if (!state.progress) return;

            dispatch({
                type: 'VOCAB_INTRO_CHOICE',
                choice: choice,
                vocabId: vocabulary.id
            });
        },

        async learnNextKanji() {
            if (!state.progress || !state.nextKanjiToLearn) return;

            const newKanjiSet = new Set(state.progress.kanjiKnowledge.kanjiSet);
            state.nextKanjiToLearn.kanjis.forEach(k => newKanjiSet.add(k));

            const updatedProgress: UserProgress = {
                ...state.progress,
                kanjiKnowledge: {
                    ...state.progress.kanjiKnowledge,
                    step: state.nextKanjiToLearn.step,
                    kanjiSet: newKanjiSet
                }
            };

            dispatch({ type: 'LEARN_NEXT_KANJI', payload: updatedProgress });
        },

        async buildSessionQueue(now) {
            // Keep action stub for manual invocation if needed by external, though useEffect mostly handles it
            dispatch({ type: 'BUILD_SESSION_QUEUE', payload: { queue: [], builtAt: now.getTime() } });
        },

        reset() {
            StorageService.clearProgress();
            try {
                logout(); // Disconnect from drive so we don't auto-restore the wiped data
            } catch (e) {
                console.error("Failed to logout during reset", e);
            }
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

    /* ---------- Auto-Sync & Reactivity ---------- */

    // AUTO-UPLOAD: Whenever progress or settings change, upload to Drive in background
    useEffect(() => {
        if (state.progress && state.settings && !isDownloading) {
            // Debounce could be added here if needed, but for now we trust the service
            // The uploadProgress function is safe to call repeatedly (fire and forget)
            uploadProgress({ progress: state.progress, settings: state.settings }).catch(err => {
                console.error("[QuizContext] Auto-upload failed", err);
            });
        }
    }, [state.progress, state.settings]); // Triggers on every answer, queue advance, intro choice, settings change etc.

    // REACT TO DOWNLOAD COMPLETION: Reload data when lastDownloadTime changes
    useEffect(() => {
        if (lastDownloadTime) {
            console.log(`[QuizContext] Download completed at ${lastDownloadTime}, reloading data...`);
            const refreshedProgress = StorageService.loadProgress();
            const refreshedSettings = StorageService.loadSettings() ?? DEFAULT_SETTINGS;

            if (refreshedProgress) {
                setTimeout(() => { // Avoid render cycle conflict
                    dispatch({
                        type: 'SETUP_COMPLETE',
                        payload: {
                            progress: refreshedProgress,
                            settings: refreshedSettings
                        }
                    });
                }, 0);
            }
        }
    }, [lastDownloadTime]);

    /* ---------- Load vocab ---------- */

    useEffect(() => {
        if (!nextDue) {
            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: { vocab: null, sentences: null, selectedSentenceId: null } });

            // AUTO-ADVANCE TRIGGER: If queue is empty but we can introduce new vocab, or we are exhausted and potentially have kanji to unlock
            if (state.progress && state.settings && (sessionView.sessionState === 'learn' || sessionView.sessionState === 'exhausted')) {
                const now = new Date();
                actions.advanceQueue({ now });
            }
            return;
        }

        // [UPDATED] Pass nextDue (QuizItem)
        // We need to reconstruct the QuizItem properly if it came from the "hack" above
        const itemToLoad = nextDue;
        if (!itemToLoad.vocab && itemToLoad.vocabId) {
            // It's the Intro Candidate hack, keep as is
            // Or fix the hack? The hack is just to satisify TS in nextDue return type.
        }

        dispatch({ type: 'LOAD_VOCAB_START', payload: nextDue });

        let alive = true;

        // Use vocabId from the item safely
        const vid = 'vocabId' in nextDue ? nextDue.vocabId : nextDue.vocab.vocabId;
        const quizType = nextDue.quizType;

        // Load vocab and sentences (if meaning_context quiz) in parallel
        Promise.all([
            VocabularyService.loadVocab(vid),
            (quizType === 'meaning' && nextDue.quizMode === 'context') ? VocabularyService.loadSentences(vid) : Promise.resolve(null)
        ]).then(([vocab, sentences]) => {
            if (alive) {
                // Select a random sentence if we have sentences
                let selectedSentenceId: string | null = null;
                if (sentences && sentences.length > 0) {
                    const idx = Math.floor(Math.random() * sentences.length);
                    selectedSentenceId = sentences[idx].id;
                }

                dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: { vocab, sentences, selectedSentenceId } });
                startTimeRef.current = Date.now();
            }
        }).catch(err => {
            if (alive) {
                console.error("Failed to load vocab/sentences", err);
                dispatch({ type: 'LOAD_VOCAB_ERROR', payload: { vocabId: vid, error: err } });
            }
        });

        return () => { alive = false; };
    }, [nextDue, state.progress, state.settings, sessionView.sessionState]);

    useEffect(() => {
        // [UPDATED] Only auto-advance if it's NOT a meaning quiz
        // Meaning quizzes have rich context (sentences) that user might want to read
        if (state.feedback?.correct && state.currentQuizItem?.quizType !== 'meaning') {
            const timer = setTimeout(() => {
                actions.continueToNext().then();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);

            return () => clearTimeout(timer);
        }
    }, [state.feedback?.correct, state.currentQuizItem]);

    /* =========================
       COMPUTED FLAGS
       ========================= */

    const computed = {
        canSubmit:
            !!state.userAnswer.trim() &&
            !!state.currentVocab &&
            !state.feedback?.show &&
            !state.isLoadingVocab &&
            !state.isEvaluatingAi, // Don't submit twice

        canContinue: !!(state.feedback?.show && (!state.feedback.correct || state.currentQuizItem?.quizType === 'meaning')),

        isReady: !!state.currentVocab && !state.isLoadingVocab && !state.isEvaluatingAi,
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
