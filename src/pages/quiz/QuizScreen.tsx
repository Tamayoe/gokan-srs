import {WaitingScreen} from "../../components/WaitingScreen";
import {ExhaustedScreen} from "../../components/ExhaustedScreen";
import {ProgressBar} from "../../components/ProgressBar";
import {QuizCard} from "./QuizCard";
import {LoadingScreen} from "../../components/LoadingScreen";
import {canIntroduceNew, hasDueVocab} from "../../utils/srs.utils";
import {useEffect} from "react";
import {useQuiz} from "../../context/useQuiz";
import VocabIntroCard from "../../components/VocabIntroCard";

export function QuizScreen() {
    const { state, currentProgress, sessionState, nextReviewAt, actions } = useQuiz();

    const advanceDeps = [state.progress!.learningQueue,
        state.progress!.stats.newLearnedToday,
        state.progress!.dailyOverride,
        state.settings,
    ]


    useEffect(() => {
        if (!state.progress || !state.settings) return;

        const now = new Date();

        if (
            !hasDueVocab(state.progress.learningQueue, now) &&
            canIntroduceNew(state.progress, now)
        ) {
            actions.advanceQueue({ now });
        }
    }, advanceDeps);

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
