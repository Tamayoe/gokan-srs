import React from "react";
import { View } from "react-native";
import { WaitingScreen } from "../../components/WaitingScreen";
import { ExhaustedScreen } from "../../components/ExhaustedScreen";
import { SessionProgress } from "../../components/SessionProgress";
import { QuizCard } from "./QuizCard";
import { MeaningQuizCard } from "./MeaningQuizCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { useQuiz } from "../../context/useQuiz";
import VocabIntroCard from "../../components/VocabIntroCard";
import { LearnKanjiCard } from "../../components/LearnKanjiCard";
import { styles } from "@gokan-srs/ui";

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
        return <ExhaustedScreen />;
    }

    if (sessionState === "learn-kanji" && state.nextKanjiToLearn) {
        return (
            <View style={[styles.flex1, styles.flexCol, styles.alignCenter, styles.justifyCenter, styles.p4]}>
                <LearnKanjiCard
                    nextKanji={state.nextKanjiToLearn}
                    onUnlock={() => actions.learnNextKanji()}
                />
            </View>
        );
    }

    if (state.isLoadingVocab || !state.currentVocab) {
        return <LoadingScreen />;
    }

    if (state.currentVocab && (!currentProgress || !currentProgress.introductionAt)) {
        return <VocabIntroCard vocab={state.currentVocab} onLearn={() => actions.saveVocabIntroChoice(state.currentVocab!, 'learn')} onSkip={() => actions.saveVocabIntroChoice(state.currentVocab!, 'skip')} />;
    }

    return (
        <View style={[styles.flex1, styles.flexCol, styles.alignCenter]}>
            <SessionProgress />

            <View style={[styles.flex1, styles.wFull, styles.flexCol, styles.alignCenter, styles.justifyCenter, styles.py6]}>
                {state.currentQuizItem?.quizType === 'meaning' ? (
                    <MeaningQuizCard
                        onKanjiClick={() => onVocabClick(state.currentVocab!.id)}
                        onVocabClick={onVocabClick}
                    />
                ) : (
                    <QuizCard onKanjiClick={() => onVocabClick(state.currentVocab!.id)} />
                )}
            </View>
        </View>
    );
}
