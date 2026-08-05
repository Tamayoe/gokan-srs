import type { UserProgress } from '../../models/user.model';
import type { GrammarPoint } from '../../models/grammar.model';
import type { AnswerResult } from '../../services/srs.service';
import { GrammarSRSService } from '../../services/grammarSrs.service';
import type { QuizState } from './quizReducer';

/** Which example (by index) and which of its words became blanks for the CURRENT quiz turn - fixed at load time so grading matches what was shown. */
export interface GrammarBlankPlan {
    exampleIndex: number;
    blankWordIndices: number[];
}

/** A grammar point has exactly one quiz type, so this is just an id - no quizType/quizMode to track. */
export interface PendingGrammarQuizItem {
    grammarId: string;
}

export interface GrammarQuizState {
    currentGrammarPoint: GrammarPoint | null;
    currentGrammarQuizItem: PendingGrammarQuizItem | null;
    currentGrammarBlankPlan: GrammarBlankPlan | null;
    /** One answer per entry in currentGrammarBlankPlan.blankWordIndices, same order. */
    grammarAnswers: string[];
    grammarFeedback: {
        show: boolean;
        correct: boolean; // true only when every blank was strictly correct
        type: AnswerResult; // worst-of across every blank
        message: string;
        matchedAnswers: string[]; // same order as blankWordIndices
    } | null;
    isLoadingGrammar: boolean;
    /** Potential new grammar points, not yet in grammarQueue - mirrors introCandidates. */
    grammarIntroCandidates: GrammarPoint[];
}

export const initialGrammarState: GrammarQuizState = {
    currentGrammarPoint: null,
    currentGrammarQuizItem: null,
    currentGrammarBlankPlan: null,
    grammarAnswers: [],
    grammarFeedback: null,
    isLoadingGrammar: false,
    grammarIntroCandidates: [],
};

export type GrammarQuizAction =
    | { type: 'GRAMMAR_LOAD_START'; payload: PendingGrammarQuizItem }
    | { type: 'GRAMMAR_LOAD_SUCCESS'; payload: { point: GrammarPoint | null; blankPlan: GrammarBlankPlan | null } }
    | { type: 'GRAMMAR_LOAD_ERROR'; payload: { grammarId: string; error: any } }
    | { type: 'GRAMMAR_SET_ANSWER'; payload: { index: number; value: string } }
    | { type: 'GRAMMAR_SUBMIT_ANSWER'; payload: { type: AnswerResult; message: string; matchedAnswers: string[] } }
    | { type: 'GRAMMAR_UPDATE_AFTER_ANSWER'; payload: { progress: UserProgress } }
    | { type: 'GRAMMAR_ADVANCE_QUEUE'; payload: { progress: UserProgress; candidates?: GrammarPoint[] } }
    | { type: 'GRAMMAR_INTRO_CHOICE'; grammarId: string; choice: 'learn' | 'skip'; grammarPoint?: GrammarPoint }
    | { type: 'GRAMMAR_CLEAR_FEEDBACK' };

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
                grammarFeedback: null,
            };

        case 'GRAMMAR_LOAD_SUCCESS': {
            const blankCount = action.payload.blankPlan?.blankWordIndices.length ?? 0;
            return {
                ...state,
                currentGrammarPoint: action.payload.point,
                currentGrammarBlankPlan: action.payload.blankPlan,
                grammarAnswers: new Array(blankCount).fill(''),
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

        case 'GRAMMAR_SUBMIT_ANSWER':
            return {
                ...state,
                grammarFeedback: {
                    show: true,
                    correct: action.payload.type === 'correct',
                    type: action.payload.type,
                    message: action.payload.message,
                    matchedAnswers: action.payload.matchedAnswers,
                },
            };

        case 'GRAMMAR_UPDATE_AFTER_ANSWER':
            return {
                ...state,
                progress: action.payload.progress,
                grammarFeedback: null,
                grammarAnswers: [],
            };

        case 'GRAMMAR_ADVANCE_QUEUE':
            return {
                ...state,
                progress: action.payload.progress,
                grammarIntroCandidates: action.payload.candidates ?? state.grammarIntroCandidates,
                grammarFeedback: null,
                grammarAnswers: [],
            };

        case 'GRAMMAR_CLEAR_FEEDBACK':
            return { ...state, grammarFeedback: null };

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

            return {
                ...state,
                progress: { ...state.progress, grammarQueue: updatedQueue },
                grammarIntroCandidates: nextCandidates,
            };
        }

        default:
            return state;
    }
}
