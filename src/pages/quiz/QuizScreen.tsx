import { WaitingScreen } from "../../components/WaitingScreen";
import { ExhaustedScreen } from "../../components/ExhaustedScreen";
import { ProgressBar } from "../../components/ProgressBar";
import { QuizCard } from "./QuizCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useQuiz } from "../../context/useQuiz";
import VocabIntroCard from "../../components/VocabIntroCard";

export function QuizScreen() {
    const { state, currentProgress, sessionState, nextReviewAt, actions } = useQuiz();

    if (sessionState === "waiting") {
        return (
            <WaitingScreen
                nextReviewAt={nextReviewAt!}
                onLearnMore={actions.overrideDailyLimit}
            />
        );
    }

    if (sessionState === "exhausted") {
        return <ExhaustedScreen onReset={actions.reset} />;
    }

    if (state.isLoadingVocab || !state.currentVocab) {
        return <LoadingScreen />;
    }

    if (state.currentVocab && currentProgress && !currentProgress.introductionAt) {
        return <VocabIntroCard vocab={state.currentVocab} onLearn={() => actions.saveVocabIntroChoice(state.currentVocab!, 'learn')} onSkip={() => actions.saveVocabIntroChoice(state.currentVocab!, 'skip')}></VocabIntroCard>
    }

    return (
        <>
            <div className={"flex flex-col"}>
                <ProgressBar progress={state.progress!} />
                <QuizCard />
            </div>
        </>
    );
}
