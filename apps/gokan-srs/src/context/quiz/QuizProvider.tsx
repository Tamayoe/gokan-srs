import React, { useReducer } from 'react';
import type { ReactNode } from 'react';
import type { KanjiKnowledge, UserSettings } from '../../models/user.model';
import { DEFAULT_SETTINGS } from '../../models/user.model';
import type { VocabProgress, Vocabulary } from '../../models/vocabulary.model';
import type { GrammarProgress, GrammarPoint } from '../../models/grammar.model';
import { StorageService } from '../../services/storage.service';
import type { SetupValues } from '../../models/state.model';
import type { SessionState } from '../../models/state.model';
import { QuizContext } from '../useQuiz';
import { quizReducer, initialState } from './quizReducer';
import type { QuizState } from './quizReducer';
import type { SessionStats, NextSessionPreview } from './quizSelectors';
import { useQuizOrchestration } from './useQuizOrchestration';
import { useGrammarOrchestration } from './useGrammarOrchestration';
import type { GrammarSessionState, NextGrammarSessionPreview } from './grammarSelectors';

export interface QuizContextValue {
    state: QuizState;
    sessionState: SessionState;
    nextReviewAt: Date | null;
    currentProgress: VocabProgress | null;
    /** True when the currently-loaded vocab hasn't been introduced yet and should show the intro card. */
    shouldShowIntro: boolean;
    isSetupComplete: boolean;
    /** Progress counter for the active study session (done/total, retries, waiting). */
    sessionStats: SessionStats;
    /** Preview of what the next study session will contain (review/new/retries), shown on the Main hub. */
    nextSessionPreview: NextSessionPreview;

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
        reset(): void;
    };

    computed: {
        canSubmit: boolean;
        canContinue: boolean;
        isReady: boolean;
    };

    /* ---------- Grammar activity (see useGrammarOrchestration.ts) ---------- */
    grammarSessionState: GrammarSessionState;
    grammarNextReviewAt: Date | null;
    currentGrammarProgress: GrammarProgress | null;
    shouldShowGrammarIntro: boolean;
    nextGrammarSessionPreview: NextGrammarSessionPreview;
    grammarActions: {
        setGrammarAnswer(index: number, value: string): void;
        submitGrammarAnswer(): Promise<void>;
        advanceGrammarQueue(): Promise<void>;
        continueGrammarToNext(): Promise<void>;
        saveGrammarIntroChoice(grammarPoint: GrammarPoint, choice: 'learn' | 'skip'): void;
    };
    grammarComputed: {
        canSubmitGrammar: boolean;
        canContinueGrammar: boolean;
        isGrammarReady: boolean;
    };
}

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(quizReducer, {
        ...initialState,
        progress: StorageService.loadProgress(),
        settings: StorageService.loadSettings() ?? DEFAULT_SETTINGS,
    });

    const { actions, nextView, currentProgress, computed, sessionStats, nextSessionPreview } = useQuizOrchestration(state, dispatch);
    const {
        grammarActions,
        grammarNextView,
        currentGrammarProgress,
        grammarComputed,
        nextGrammarSessionPreview,
    } = useGrammarOrchestration(state, dispatch);

    return (
        <QuizContext.Provider
            value={{
                state,
                sessionState: nextView.sessionState,
                nextReviewAt: nextView.nextReviewAt,
                currentProgress,
                shouldShowIntro: nextView.shouldShowIntro,
                isSetupComplete: !!state.progress,
                sessionStats,
                nextSessionPreview,
                actions,
                computed,
                grammarSessionState: grammarNextView.sessionState,
                grammarNextReviewAt: grammarNextView.nextReviewAt,
                currentGrammarProgress,
                shouldShowGrammarIntro: grammarNextView.shouldShowIntro,
                nextGrammarSessionPreview,
                grammarActions,
                grammarComputed,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
};
