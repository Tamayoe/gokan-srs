import type {
    KanjiKnowledge,
    UserProgress,
    UserSettings,
} from '../../models/user.model';
import type { Vocabulary } from '../../models/vocabulary.model';
import type { Sentence } from '../../models/sentence.model';
import type { AnswerResult } from '../../services/srs.service';
import { SRSService } from '../../services/srs.service';
import type { QuizItem, QuizType, QuizMode } from '../../utils/srs.utils';

/* =========================
   STATE & TYPES
   ========================= */

// Union type for items we are about to study (Queue Item OR Intro Candidate)
export type PendingQuizItem = QuizItem | { vocabId: string; quizType: QuizType; quizMode: QuizMode; vocab?: undefined };

export interface QuizState {
    progress: UserProgress | null;
    settings: UserSettings | null;
    currentVocab: Vocabulary | null;
    currentSentences: Sentence[] | null;
    currentSentenceId: string | null;
    currentQuizItem: PendingQuizItem | null;
    userAnswer: string;
    feedback: {
        show: boolean;
        correct: boolean; // true only for strict 'correct', not minor_error
        type: AnswerResult;
        message: string;
        matchedAnswer: string;
    } | null;
    isLoadingVocab: boolean;
    isEvaluatingAi: boolean;
    introCandidates: Vocabulary[]; // Potential new items, not yet in learningQueue
    nextKanjiToLearn: { step: number; kanjis: string[] } | null;
    sessionHistory: Array<{
        vocabId: string;
        writtenForm: string;
        result: AnswerResult;
        delta: number;
    }>;
    fatalError: string | null;
}

export type QuizAction =
    | { type: 'SETUP_COMPLETE'; payload: { progress: UserProgress; settings: UserSettings } }
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
    | { type: 'VOCAB_INTRO_CHOICE'; vocabId: string; choice: 'learn' | 'skip'; vocabulary?: Vocabulary; }
    | { type: 'SET_NEXT_KANJI'; payload: { step: number; kanjis: string[] } | null; }
    | { type: 'LEARN_NEXT_KANJI'; payload: UserProgress }
    | { type: 'RESET_DAILY_STATS' }
    | { type: 'RECONCILE_REMOTE'; payload: { progress: UserProgress; settings: UserSettings } };

export const initialState: QuizState = {
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
    nextKanjiToLearn: null,
    sessionHistory: [],
    fatalError: null,
};

function sameKanjiSet(a: Set<string>, b: Set<string>): boolean {
    if (a === b) return true;
    if (a.size !== b.size) return false;
    for (const k of a) if (!b.has(k)) return false;
    return true;
}

function sameKanjiKnowledge(a: KanjiKnowledge | undefined, b: KanjiKnowledge): boolean {
    if (!a) return false;
    return a.method === b.method && a.step === b.step && sameKanjiSet(a.kanjiSet, b.kanjiSet);
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
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
                currentQuizItem: action.payload,
                currentSentences: null,
                currentSentenceId: null,
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

        case 'LEARN_NEXT_KANJI':
            return {
                ...state,
                progress: action.payload,
                nextKanjiToLearn: null
            };

        case 'LOAD_VOCAB_ERROR':
            console.error(`[quizReducer] CRITICAL: Failed to load vocab ${action.payload.vocabId}`, action.payload.error);
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
                sessionHistory: [action.payload.historyItem, ...state.sessionHistory].slice(0, 50),
                introCandidates: state.introCandidates.filter(c => c.id !== action.payload.historyItem.vocabId),
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

        case 'SAVE_SETTINGS': {
            const orderChanged =
                state.settings?.preferredLearningOrder !== action.payload.preferredLearningOrder ||
                state.settings?.kanjiCoverageTarget !== action.payload.kanjiCoverageTarget;

            return {
                ...state,
                settings: action.payload,
                introCandidates: orderChanged ? [] : state.introCandidates,
            };
        }

        case 'UPDATE_KANJI_KNOWLEDGE': {
            if (!state.progress) return state;

            // Which vocabulary is optimal to learn next depends directly on which
            // kanji the user knows, so a cached introCandidates buffer computed
            // under the old kanji set is stale the moment that set changes - the
            // same invalidation SAVE_SETTINGS does when the learning order changes.
            // Clearing it makes selectNextView return no queue item, which drives
            // useQuizOrchestration to re-run advanceQueue against the new knowledge.
            const changed = !sameKanjiKnowledge(state.progress.kanjiKnowledge, action.payload);

            // KanjiKnowledgeEditor fires its onChange on mount as well as on edit,
            // so an unchanged payload must not discard a perfectly good buffer.
            if (!changed) return state;

            return {
                ...state,
                progress: {
                    ...state.progress,
                    kanjiKnowledge: action.payload,
                },
                introCandidates: [],
                // A pending "unlock the next KKLC step" prompt was computed from the
                // old kanji set too; advanceQueue re-derives it.
                nextKanjiToLearn: null,
            };
        }

        case 'OVERRIDE_DAILY_LIMIT':
            return {
                ...state,
                progress: state.progress
                    ? { ...state.progress, dailyOverride: true }
                    : null,
            };

        case 'RESET':
            return { ...initialState };

        case 'RECONCILE_REMOTE':
            // The merge itself (reconciling remote changes against whatever the user
            // is doing right now) already happened in useQuizOrchestration before this
            // was dispatched - the reducer just assigns the reconciled result. Everything
            // else (currentVocab, userAnswer, feedback) is left untouched so an in-flight
            // answer isn't interrupted by a background sync.
            return {
                ...state,
                progress: action.payload.progress,
                settings: action.payload.settings,
            };

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

            // Determine new introCandidates:
            // - If vocab was already in candidates (intro card flow): remove it normally.
            // - If vocab was NOT in candidates (detail page "Add to Learning List"):
            //   insert it at a random position so it appears naturally among other candidates.
            const wasInCandidates = state.introCandidates.some(c => c.id === action.vocabId);
            let nextCandidates = state.introCandidates.filter(c => c.id !== action.vocabId);

            if (!wasInCandidates && action.vocabulary) {
                const insertAt = Math.floor(Math.random() * (nextCandidates.length + 1));
                nextCandidates = [
                    ...nextCandidates.slice(0, insertAt),
                    action.vocabulary,
                    ...nextCandidates.slice(insertAt),
                ];
            }

            return {
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
                introCandidates: nextCandidates,
            };
        }

        default:
            return state;
    }
}
