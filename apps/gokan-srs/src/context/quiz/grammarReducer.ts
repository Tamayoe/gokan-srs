import type { UserProgress } from '../../models/user.model';
import type { GrammarPoint } from '../../models/grammar.model';
import type { AnswerResult } from '../../services/srs.service';
import { GrammarSRSService } from '../../services/grammarSrs.service';
import type { QuizState } from './quizReducer';

/** Which example (by index) and which of its words became blanks for the CURRENT quiz turn - fixed at load time so grading matches what was shown. */
export interface GrammarBlankPlan {
    exampleIndex: number;
    blankWordIndices: number[];
    /** Per-blank list of accepted answer forms (surface, reading, kanji alternatives, ...), same order as blankWordIndices - resolved once at load time so grading stays synchronous. */
    acceptLists: string[][];
    /** Per-blank English gloss for the hint control, same order as blankWordIndices. Empty string when unavailable. */
    glosses: string[];
    /** True when no word in ANY of the point's examples resolved to a vocab id - nothing gradable, rendered as read-only study material instead of a quiz. */
    readOnly: boolean;
}

/** A grammar point has exactly one quiz type, so this is just an id - no quizType/quizMode to track. */
export interface PendingGrammarQuizItem {
    grammarId: string;
}

/**
 * Grammar's equivalent of vocab's SessionTracking - the set of grammar points
 * committed to the current study session, captured once when the session
 * begins and extended only by the user's own "Learn" choices. A GrammarProgress
 * has a single SRSEntry/quiz type, so the committed set is just grammar ids
 * (no per-quiz-type task keys the way vocab needs).
 */
export interface GrammarSessionTracking {
    committed: string[];
}

export interface GrammarQuizState {
    currentGrammarPoint: GrammarPoint | null;
    currentGrammarQuizItem: PendingGrammarQuizItem | null;
    currentGrammarBlankPlan: GrammarBlankPlan | null;
    /** One answer per entry in currentGrammarBlankPlan.blankWordIndices, same order. */
    grammarAnswers: string[];
    /** Per-blank progressive hint level, same order as blankWordIndices: 0 = none, 1 = gloss shown, 2 = answer revealed (grades as 'pass'). */
    grammarHintLevels: number[];
    grammarFeedback: {
        show: boolean;
        correct: boolean; // true only when every blank was strictly correct
        type: AnswerResult; // worst-of across every blank
        message: string;
        matchedAnswers: string[]; // same order as blankWordIndices
        perBlankResults: AnswerResult[]; // same order as blankWordIndices - which specific blank(s) were wrong
    } | null;
    isLoadingGrammar: boolean;
    /** Potential new grammar points, not yet in grammarQueue - mirrors introCandidates. */
    grammarIntroCandidates: GrammarPoint[];
    /** Task set of the active grammar study session (null between sessions). See GrammarSessionTracking. */
    grammarSession: GrammarSessionTracking | null;
    grammarSessionHistory: Array<{
        grammarId: string;
        title: string;
        result: AnswerResult;
        delta: number;
    }>;
}

export const initialGrammarState: GrammarQuizState = {
    currentGrammarPoint: null,
    currentGrammarQuizItem: null,
    currentGrammarBlankPlan: null,
    grammarAnswers: [],
    grammarHintLevels: [],
    grammarFeedback: null,
    isLoadingGrammar: false,
    grammarIntroCandidates: [],
    grammarSession: null,
    grammarSessionHistory: [],
};

export type GrammarQuizAction =
    | { type: 'GRAMMAR_LOAD_START'; payload: PendingGrammarQuizItem }
    | { type: 'GRAMMAR_LOAD_SUCCESS'; payload: { point: GrammarPoint | null; blankPlan: GrammarBlankPlan | null } }
    | { type: 'GRAMMAR_LOAD_ERROR'; payload: { grammarId: string; error: any } }
    | { type: 'GRAMMAR_SET_ANSWER'; payload: { index: number; value: string } }
    | { type: 'GRAMMAR_REVEAL_HINT'; payload: { index: number } }
    | { type: 'GRAMMAR_SUBMIT_ANSWER'; payload: { type: AnswerResult; message: string; matchedAnswers: string[]; perBlankResults: AnswerResult[] } }
    | { type: 'GRAMMAR_UPDATE_AFTER_ANSWER'; payload: { progress: UserProgress; historyItem?: { grammarId: string; title: string; result: AnswerResult; delta: number } | null } }
    | { type: 'GRAMMAR_ADVANCE_QUEUE'; payload: { progress: UserProgress; candidates?: GrammarPoint[] } }
    | { type: 'GRAMMAR_INTRO_CHOICE'; grammarId: string; choice: 'learn' | 'skip'; grammarPoint?: GrammarPoint }
    | { type: 'GRAMMAR_CLEAR_FEEDBACK' }
    | { type: 'GRAMMAR_SESSION_START'; payload: { grammarIds: string[]; progress?: UserProgress } }
    | { type: 'GRAMMAR_SESSION_END' };

/** Every grammar action is prefixed GRAMMAR_ so quizReducer can delegate to this module without the two action unions needing to know about each other's cases. */
export function isGrammarAction(action: { type: string }): action is GrammarQuizAction {
    return action.type.startsWith('GRAMMAR_');
}

export function grammarReducer(state: QuizState, action: GrammarQuizAction): QuizState {
    switch (action.type) {
        case 'GRAMMAR_LOAD_START':
            return {
                ...state,
                isLoadingGrammar: true,
                currentGrammarQuizItem: action.payload,
                grammarAnswers: [],
                grammarHintLevels: [],
                grammarFeedback: null,
            };

        case 'GRAMMAR_LOAD_SUCCESS': {
            const blankCount = action.payload.blankPlan?.blankWordIndices.length ?? 0;
            return {
                ...state,
                currentGrammarPoint: action.payload.point,
                currentGrammarBlankPlan: action.payload.blankPlan,
                grammarAnswers: new Array(blankCount).fill(''),
                grammarHintLevels: new Array(blankCount).fill(0),
                isLoadingGrammar: false,
            };
        }

        case 'GRAMMAR_LOAD_ERROR':
            console.error(`[grammarReducer] CRITICAL: Failed to load grammar point ${action.payload.grammarId}`, action.payload.error);
            return {
                ...state,
                isLoadingGrammar: false,
                fatalError: `Failed to load grammar data for ID: ${action.payload.grammarId}. The application data may be corrupted. Please reload or contact support.`,
            };

        case 'GRAMMAR_SET_ANSWER': {
            const answers = [...state.grammarAnswers];
            answers[action.payload.index] = action.payload.value;
            return { ...state, grammarAnswers: answers };
        }

        case 'GRAMMAR_REVEAL_HINT': {
            const levels = [...state.grammarHintLevels];
            const current = levels[action.payload.index] ?? 0;
            levels[action.payload.index] = Math.min(2, current + 1);
            return { ...state, grammarHintLevels: levels };
        }

        case 'GRAMMAR_SUBMIT_ANSWER':
            return {
                ...state,
                grammarFeedback: {
                    show: true,
                    correct: action.payload.type === 'correct',
                    type: action.payload.type,
                    message: action.payload.message,
                    matchedAnswers: action.payload.matchedAnswers,
                    perBlankResults: action.payload.perBlankResults,
                },
            };

        case 'GRAMMAR_UPDATE_AFTER_ANSWER':
            return {
                ...state,
                progress: action.payload.progress,
                grammarFeedback: null,
                grammarAnswers: [],
                grammarHintLevels: [],
                grammarSessionHistory: action.payload.historyItem
                    ? [action.payload.historyItem, ...state.grammarSessionHistory].slice(0, 50)
                    : state.grammarSessionHistory,
            };

        case 'GRAMMAR_ADVANCE_QUEUE':
            return {
                ...state,
                progress: action.payload.progress,
                grammarIntroCandidates: action.payload.candidates ?? state.grammarIntroCandidates,
                grammarFeedback: null,
                grammarAnswers: [],
                grammarHintLevels: [],
            };

        case 'GRAMMAR_CLEAR_FEEDBACK':
            return { ...state, grammarFeedback: null };

        case 'GRAMMAR_SESSION_START':
            // Snapshot the session's committed grammar-id set. Computed with `now` in
            // the orchestration layer (keeping this reducer free of Date.now) and passed in.
            // `progress` is only present when clearStaleGrammarNeedsRetry (issue #36)
            // actually cleared a stale cross-session retry flag colliding with a fresh
            // due review.
            return {
                ...state,
                ...(action.payload.progress ? { progress: action.payload.progress } : {}),
                grammarSession: { committed: action.payload.grammarIds },
            };

        case 'GRAMMAR_SESSION_END':
            return state.grammarSession ? { ...state, grammarSession: null } : state;

        case 'GRAMMAR_INTRO_CHOICE': {
            if (!state.progress) return state;

            const newProgressItem = GrammarSRSService.createGrammarProgress(action.grammarId);
            const processedItem = GrammarSRSService.applyGrammarIntroChoice(newProgressItem, action.choice);

            const existingIndex = state.progress.grammarQueue.findIndex(g => g.grammarId === action.grammarId);
            let updatedQueue;

            if (existingIndex >= 0) {
                updatedQueue = [...state.progress.grammarQueue];
                updatedQueue[existingIndex] = {
                    ...updatedQueue[existingIndex],
                    ...processedItem,
                    entry: { ...processedItem.entry, history: updatedQueue[existingIndex].entry.history },
                };
            } else {
                updatedQueue = [...state.progress.grammarQueue, processedItem];
            }

            const wasInCandidates = state.grammarIntroCandidates.some(c => c.id === action.grammarId);
            let nextCandidates = state.grammarIntroCandidates.filter(c => c.id !== action.grammarId);

            if (!wasInCandidates && action.grammarPoint) {
                const insertAt = Math.floor(Math.random() * (nextCandidates.length + 1));
                nextCandidates = [
                    ...nextCandidates.slice(0, insertAt),
                    action.grammarPoint,
                    ...nextCandidates.slice(insertAt),
                ];
            }

            // A point the user chooses to Learn becomes part of the current session's
            // committed workload (its single entry is now due immediately), mirroring
            // VOCAB_INTRO_CHOICE. Skipped points graduate straight away and add nothing.
            let nextGrammarSession = state.grammarSession;
            if (nextGrammarSession && action.choice === 'learn') {
                if (!nextGrammarSession.committed.includes(action.grammarId)) {
                    nextGrammarSession = { ...nextGrammarSession, committed: [...nextGrammarSession.committed, action.grammarId] };
                }
            }

            return {
                ...state,
                progress: { ...state.progress, grammarQueue: updatedQueue },
                grammarIntroCandidates: nextCandidates,
                grammarSession: nextGrammarSession,
            };
        }

        default:
            return state;
    }
}
