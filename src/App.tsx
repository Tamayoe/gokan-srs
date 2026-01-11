import React, {useEffect, useState} from 'react';
import './App.css';
import { SetupScreen } from './pages/setup/SetupScreen';
import { THEME } from './commons/theme';
import { Logo } from './components/Logo';
import { ProgressBar } from './components/ProgressBar';
import { QuizCard } from './pages/quiz/QuizCard';
import {useQuiz} from "./context/QuizContext";
import {SettingsScreen} from "./pages/settings/Settings";
import { Settings } from 'lucide-react';
import {WaitingScreen} from "./components/WaitingScreen";
import {ExhaustedScreen} from "./components/ExhaustedScreen";
import {canIntroduceNew, hasDueVocab} from "./utils/srs.utils";

export type Screen = 'quiz' | 'settings';

export const App: React.FC = () => {
    const { state, sessionState, nextReviewAt, actions } = useQuiz();
    const [screen, setScreen] = useState<Screen>('quiz');

    useEffect(() => {
        if (!state.progress || !state.settings) return;

        const now = new Date();

        if (
            !hasDueVocab(state.progress.learningQueue, now) &&
            canIntroduceNew(state.progress, now)
        ) {
            actions.advanceQueue({ now });
        }
    }, [
        state.progress!.learningQueue,
        state.progress!.stats.newLearnedToday,
        state.progress!.dailyOverride,
        state.settings,
    ]);

    // Setup screen
    if (!state.isSetupComplete) {
        return <SetupScreen onComplete={actions.setupComplete} />;
    }

    if (screen === 'settings') {
        return (
            <SettingsScreen
                settings={state.settings!}
                onUpdateSettings={actions.saveSettings}
                onReset={actions.reset}
                onBack={() => setScreen('quiz')}
            />
        );
    }

    // No vocabulary available
    if (sessionState === 'waiting') {
        return <WaitingScreen nextReviewAt={nextReviewAt!} onLearnMore={actions.overrideDailyLimit} />;
    }

    if (sessionState === 'exhausted') {
        return <ExhaustedScreen onReset={actions.reset} />;
    }

    if (!state.progress || state.progress.learningQueue.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-8"
                style={{ backgroundColor: THEME.colors.background }}
            >
                <div
                    className="border rounded p-8 max-w-md w-full text-center"
                    style={{
                        backgroundColor: THEME.colors.surface,
                        borderColor: THEME.colors.divider,
                    }}
                >
                    <h2
                        className="text-xl mb-4"
                        style={{
                            color: THEME.colors.primary,
                            fontFamily: THEME.fonts.serif,
                        }}
                    >
                        All vocabulary reviewed.
                    </h2>
                    <p
                        className="text-sm mb-6"
                        style={{
                            color: THEME.colors.secondary,
                            fontFamily: THEME.fonts.serif,
                        }}
                    >
                        No more words available for your current kanji level.
                    </p>
                    <button
                        onClick={actions.reset}
                        className="font-medium py-2 px-6 rounded transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = THEME.colors.accentHover)
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = THEME.colors.accent)
                        }
                    >
                        Reset progress
                    </button>
                </div>
            </div>
        );
    }

    // Loading vocabulary
    console.debug('isLoadingVocab', state.isLoadingVocab)
    console.debug('currentVocab', state.currentVocab)
    if (state.isLoadingVocab || !state.currentVocab) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: THEME.colors.background }}
            >
                <div style={{ color: THEME.colors.secondary }}>Loading vocabulary...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >

            <div className="absolute top-6 left-6">
                <Logo />
            </div>

            <div className="absolute top-6 right-6">
                <button
                    onClick={() => setScreen('settings')}
                    aria-label="Settings"
                    className="transition-colors"
                    style={{ color: THEME.colors.secondary }}
                    onMouseEnter={e => e.currentTarget.style.color = THEME.colors.primary}
                    onMouseLeave={e => e.currentTarget.style.color = THEME.colors.secondary}
                >
                    <Settings size={18} />
                </button>
            </div>

            <ProgressBar progress={state.progress} />
            <QuizCard />
        </div>
    );
};