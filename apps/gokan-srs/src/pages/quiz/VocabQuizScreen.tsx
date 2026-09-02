import { WaitingScreen } from "../../components/WaitingScreen";
import { ExhaustedScreen } from "../../components/ExhaustedScreen";
import { SessionProgress } from "../../components/SessionProgress";
import type { SessionHistoryEntry } from "../../components/SessionProgress";
import { VocabQuizCard } from "./VocabQuizCard";
import { VocabMeaningQuizCard } from "./VocabMeaningQuizCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useQuiz } from "../../context/useQuiz";
import VocabIntroCard from "../../components/VocabIntroCard";
import { QuizSettingsMenu } from "../../components/QuizSettingsMenu";
import { VocabQuizSettings } from "../settings/sections/VocabQuizSettings";
import { LearnKanjiCard } from "../../components/LearnKanjiCard";

interface VocabQuizScreenProps {
    onVocabClick: (vocabId: string) => void;
}

export function VocabQuizScreen({ onVocabClick }: VocabQuizScreenProps) {
    const { state, shouldShowIntro, sessionState, nextReviewAt, actions, sessionStats } = useQuiz();

    /*
     * The cog for settings scoped to THIS activity, pinned to the top right of
     * the session. Rendered above the card (rather than inside it) so it sits in
     * the same place whether an intro card, a reading quiz or a meaning quiz is
     * showing, and so it never collides with the card's own top-right mastery ring.
     */
    const settingsBar = (
        <div className="w-full max-w-2xl mx-auto flex justify-end mb-1">
            <QuizSettingsMenu title="Vocabulary quiz settings">
                <VocabQuizSettings
                    settings={state.settings!}
                    onUpdateSettings={actions.saveSettings}
                    dense
                />
            </QuizSettingsMenu>
        </div>
    );

    // Exhaustive switch over every SessionState - this is the single place that
    // decides what the quiz screen shows, replacing what used to be three
    // independent decision points (a queue-level memo, a session-view function,
    // and an ad-hoc currentProgress.introductionAt check here) that could drift
    // out of agreement.
    switch (sessionState) {
        case "waiting":
            return (
                <WaitingScreen
                    nextReviewAt={nextReviewAt!}
                    onLearnMore={actions.overrideDailyLimit}
                />
            );

        case "exhausted":
            return <ExhaustedScreen />;

        case "learn-kanji":
            if (!state.nextKanjiToLearn) return <LoadingScreen />;
            return (
                <div className="flex flex-col flex-1 items-center justify-center p-4">
                    <LearnKanjiCard
                        nextKanji={state.nextKanjiToLearn}
                        onUnlock={() => actions.learnNextKanji()}
                    />
                </div>
            );

        case "review":
        case "learn": {
            if (state.isLoadingVocab || !state.currentVocab) {
                return <LoadingScreen />;
            }

            if (shouldShowIntro) {
                return (
                    <div className="flex flex-col flex-1 items-center w-full">
                        {settingsBar}
                        <VocabIntroCard
                            vocab={state.currentVocab}
                            onLearn={() => actions.saveVocabIntroChoice(state.currentVocab!, 'learn')}
                            onSkip={() => actions.saveVocabIntroChoice(state.currentVocab!, 'skip')}
                        />
                    </div>
                );
            }

            const history: SessionHistoryEntry[] = state.sessionHistory.map((item, index) => ({
                key: `${item.vocabId}-${index}`,
                href: `/vocab/${item.vocabId}`,
                label: item.writtenForm,
                result: item.result,
                delta: item.delta,
            }));

            return (
                <div className="flex flex-col flex-1 items-center w-full">
                    {settingsBar}
                    <SessionProgress stats={sessionStats} history={history} waitingNoun="vocab" />

                    <div className="flex-1 flex items-center justify-center py-6 w-full">
                        {state.currentQuizItem?.quizType === 'meaning' ? (
                            <VocabMeaningQuizCard
                                onKanjiClick={() => onVocabClick(state.currentVocab!.id)}
                                onVocabClick={onVocabClick}
                            />
                        ) : (
                            <VocabQuizCard onKanjiClick={() => onVocabClick(state.currentVocab!.id)} />
                        )}
                    </div>
                </div>
            );
        }

        default: {
            // Compile-time exhaustiveness check: if a new SessionState is ever
            // added without handling it above, this line fails to typecheck.
            const _exhaustive: never = sessionState;
            return _exhaustive;
        }
    }
}
