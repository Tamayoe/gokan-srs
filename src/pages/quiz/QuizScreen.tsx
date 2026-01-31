import { WaitingScreen } from "../../components/WaitingScreen";
import { ExhaustedScreen } from "../../components/ExhaustedScreen";
import { SessionProgress } from "../../components/SessionProgress";
import { QuizCard } from "./QuizCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useQuiz } from "../../context/useQuiz";
import VocabIntroCard from "../../components/VocabIntroCard";

interface QuizScreenProps {
    onVocabClick: (vocabId: string) => void;
}

export function QuizScreen({ onVocabClick }: QuizScreenProps) {
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

    // Show Intro Card for new candidates (no progress) or existing items in 'learn' stage (no introductionAt)
    if (state.currentVocab && (!currentProgress || !currentProgress.introductionAt)) {
        return <VocabIntroCard vocab={state.currentVocab} onLearn={() => actions.saveVocabIntroChoice(state.currentVocab!, 'learn')} onSkip={() => actions.saveVocabIntroChoice(state.currentVocab!, 'skip')}></VocabIntroCard>
    }

    return (
        <>
            <div className="flex flex-col flex-1 items-center">
                <SessionProgress />

                <div className="flex-1 flex items-center justify-center py-6 w-full">
                    <QuizCard onKanjiClick={() => onVocabClick(state.currentVocab!.id)} />
                </div>
            </div>
        </>
    );
}
