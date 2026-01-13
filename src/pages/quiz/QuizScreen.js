import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { WaitingScreen } from "../../components/WaitingScreen";
import { ExhaustedScreen } from "../../components/ExhaustedScreen";
import { ProgressBar } from "../../components/ProgressBar";
import { QuizCard } from "./QuizCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { canIntroduceNew, hasDueVocab } from "../../utils/srs.utils";
import { useEffect } from "react";
import { useQuiz } from "../../context/useQuiz";
export function QuizScreen() {
    const { state, sessionState, nextReviewAt, actions } = useQuiz();
    const advanceDeps = [state.progress.learningQueue,
        state.progress.stats.newLearnedToday,
        state.progress.dailyOverride,
        state.settings,];
    useEffect(() => {
        if (!state.progress || !state.settings)
            return;
        const now = new Date();
        if (!hasDueVocab(state.progress.learningQueue, now) &&
            canIntroduceNew(state.progress, now)) {
            actions.advanceQueue({ now });
        }
    }, advanceDeps);
    if (sessionState === "waiting") {
        return (_jsx(WaitingScreen, { nextReviewAt: nextReviewAt, onLearnMore: actions.overrideDailyLimit }));
    }
    if (sessionState === "exhausted") {
        return _jsx(ExhaustedScreen, { onReset: actions.reset });
    }
    if (state.isLoadingVocab || !state.currentVocab) {
        return _jsx(LoadingScreen, {});
    }
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "flex flex-col", children: [_jsx(ProgressBar, { progress: state.progress }), _jsx(QuizCard, {})] }) }));
}
