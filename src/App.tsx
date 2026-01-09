import React from 'react';
import './App.css';
import { SetupScreen } from './pages/setup/SetupScreen';
import { THEME } from './commons/theme';
import { Logo } from './components/Logo';
import { ProgressBar } from './components/ProgressBar';
import { QuizCard } from './pages/quiz/QuizCard';
import { FONT_IMPORTS } from './main';
import {useQuiz} from "./context/QuizContext.tsx";

// ============================================================================
// ULTRA-SIMPLE APP - Just routing between screens
// ============================================================================

export const App: React.FC = () => {
    const { state, actions } = useQuiz();

    // Setup screen
    if (!state.isSetupComplete) {
        return <SetupScreen onComplete={actions.setupComplete} />;
    }

    // No vocabulary available
    if (!state.progress || state.progress.activeQueue.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-8"
                style={{ backgroundColor: THEME.colors.background }}
            >
                <style>{FONT_IMPORTS}</style>
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
    if (state.isLoadingVocab || !state.currentVocab) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: THEME.colors.background }}
            >
                <style>{FONT_IMPORTS}</style>
                <div style={{ color: THEME.colors.secondary }}>Loading vocabulary...</div>
            </div>
        );
    }

    // Main quiz screen
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >
            <style>{FONT_IMPORTS}</style>

            <div className="absolute top-6 left-6">
                <Logo />
            </div>

            <div className="absolute top-6 right-6">
                <button
                    onClick={actions.reset}
                    className="text-xs transition-colors"
                    style={{
                        color: THEME.colors.secondary,
                        fontFamily: THEME.fonts.gothic,
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.color = THEME.colors.primary)
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.color = THEME.colors.secondary)
                    }
                >
                    Reset
                </button>
            </div>

            <ProgressBar progress={state.progress} />
            <QuizCard />
        </div>
    );
};