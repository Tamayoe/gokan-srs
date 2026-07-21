import React, { useReducer } from 'react';
import type { ReactNode } from 'react';
import type { KanjiKnowledge, UserSettings } from '../../models/user.model';
import { DEFAULT_SETTINGS } from '../../models/user.model';
import type { VocabProgress, Vocabulary } from '../../models/vocabulary.model';
import { StorageService } from '../../services/storage.service';
import type { SetupValues } from '../../models/state.model';
import type { SessionState } from '../../models/state.model';
import { QuizContext } from '../useQuiz';
import { quizReducer, initialState } from './quizReducer';
import type { QuizState } from './quizReducer';
import type { SessionStats } from './quizSelectors';
import { useQuizOrchestration } from './useQuizOrchestration';

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
}

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(quizReducer, {
        ...initialState,
        progress: StorageService.loadProgress(),
        settings: StorageService.loadSettings() ?? DEFAULT_SETTINGS,
    });

    const { actions, nextView, currentProgress, computed, sessionStats } = useQuizOrchestration(state, dispatch);

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
                actions,
                computed,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
};
