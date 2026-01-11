import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import './App.css';
import { SetupScreen } from './pages/setup/SetupScreen';
import { THEME } from './commons/theme';
import { Logo } from './components/Logo';
import { ProgressBar } from './components/ProgressBar';
import { QuizCard } from './pages/quiz/QuizCard';
import { useQuiz } from "./context/QuizContext";
import { SettingsScreen } from "./pages/settings/Settings";
import { Settings } from 'lucide-react';
import { WaitingScreen } from "./components/WaitingScreen";
import { ExhaustedScreen } from "./components/ExhaustedScreen";
import { canIntroduceNew, hasDueVocab } from "./utils/srs.utils";
export const App = () => {
    const { state, sessionState, nextReviewAt, actions } = useQuiz();
    const [screen, setScreen] = useState('quiz');
    useEffect(() => {
        if (!state.progress || !state.settings)
            return;
        const now = new Date();
        if (!hasDueVocab(state.progress.learningQueue, now) &&
            canIntroduceNew(state.progress, now)) {
            actions.advanceQueue({ now });
        }
    }, [
        state.progress.learningQueue,
        state.progress.stats.newLearnedToday,
        state.progress.dailyOverride,
        state.settings,
    ]);
    // Setup screen
    if (!state.isSetupComplete) {
        return _jsx(SetupScreen, { onComplete: actions.setupComplete });
    }
    if (screen === 'settings') {
        return (_jsx(SettingsScreen, { settings: state.settings, onUpdateSettings: actions.saveSettings, onReset: actions.reset, onBack: () => setScreen('quiz') }));
    }
    // No vocabulary available
    if (sessionState === 'waiting') {
        return _jsx(WaitingScreen, { nextReviewAt: nextReviewAt, onLearnMore: actions.overrideDailyLimit });
    }
    if (sessionState === 'exhausted') {
        return _jsx(ExhaustedScreen, { onReset: actions.reset });
    }
    if (!state.progress || state.progress.learningQueue.length === 0) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-8", style: { backgroundColor: THEME.colors.background }, children: _jsxs("div", { className: "border rounded p-8 max-w-md w-full text-center", style: {
                    backgroundColor: THEME.colors.surface,
                    borderColor: THEME.colors.divider,
                }, children: [_jsx("h2", { className: "text-xl mb-4", style: {
                            color: THEME.colors.primary,
                            fontFamily: THEME.fonts.serif,
                        }, children: "All vocabulary reviewed." }), _jsx("p", { className: "text-sm mb-6", style: {
                            color: THEME.colors.secondary,
                            fontFamily: THEME.fonts.serif,
                        }, children: "No more words available for your current kanji level." }), _jsx("button", { onClick: actions.reset, className: "font-medium py-2 px-6 rounded transition-colors", style: {
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }, onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = THEME.colors.accentHover), onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = THEME.colors.accent), children: "Reset progress" })] }) }));
    }
    // Loading vocabulary
    console.debug('isLoadingVocab', state.isLoadingVocab);
    console.debug('currentVocab', state.currentVocab);
    if (state.isLoadingVocab || !state.currentVocab) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", style: { backgroundColor: THEME.colors.background }, children: _jsx("div", { style: { color: THEME.colors.secondary }, children: "Loading vocabulary..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center p-8", style: { backgroundColor: THEME.colors.background }, children: [_jsx("div", { className: "absolute top-6 left-6", children: _jsx(Logo, {}) }), _jsx("div", { className: "absolute top-6 right-6", children: _jsx("button", { onClick: () => setScreen('settings'), "aria-label": "Settings", className: "transition-colors", style: { color: THEME.colors.secondary }, onMouseEnter: e => e.currentTarget.style.color = THEME.colors.primary, onMouseLeave: e => e.currentTarget.style.color = THEME.colors.secondary, children: _jsx(Settings, { size: 18 }) }) }), _jsx(ProgressBar, { progress: state.progress }), _jsx(QuizCard, {})] }));
};
