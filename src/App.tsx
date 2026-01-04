import {useEffect, useState} from 'react'
import './App.css'
import type {UserProgress} from "./models/user.model.ts";
import {StorageService} from "./services/storage.service.ts";
import {SRSService} from "./services/srs.service.ts";
import {SAMPLE_VOCABULARY} from "./assets/mock.ts";
import {SetupScreen} from "./pages/setup/SetupScreen.tsx";
import {THEME} from "./commons/theme.ts";
import {Logo} from "./components/Logo.tsx";
import {ProgressBar} from "./components/ProgressBar.tsx";
import {QuizCard} from "./pages/quiz/QuizCard.tsx";
import {QuizService} from "./services/quiz.service.ts";
import {CONSTANTS} from "./commons/constants.ts";
import {FONT_IMPORTS} from "./main.tsx";

type PendingAnswer = {
    isCorrect: boolean;
};

export default function App() {
    const [isSetup, setIsSetup] = useState(true);
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string } | null>(null);
    const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(null);

    useEffect(() => {
        const saved = StorageService.loadProgress();
        if (saved) {
            console.debug('progress updated by storage', saved.activeQueue)
            setProgress(saved);
            setIsSetup(false);
        }
    }, []);

    useEffect(() => {
        if (progress) {
            StorageService.saveProgress(progress);
        }
    }, [progress]);

    const handleSetupComplete = (kanjiCount: number) => {
        const newProgress: UserProgress = {
            knownKanjiCount: kanjiCount,
            activeQueue: [],
            learnedWords: new Set(),
            stats: {
                totalLearned: 0,
                totalReviews: 0,
            },
        };

        newProgress.activeQueue = SRSService.fillQueue(
            newProgress.activeQueue,
            newProgress.knownKanjiCount,
            newProgress.learnedWords
        );
        setProgress(newProgress);
        setIsSetup(false);
    };

    const handleAnswer = (answer: string) => {
        if (!progress || feedback) return;

        const current = progress.activeQueue[0];
        const vocab = SAMPLE_VOCABULARY.find(v => v.id === current.vocabId);
        if (!vocab) return;

        const isCorrect = QuizService.validateAnswer(answer, vocab.reading);

        setPendingAnswer({ isCorrect });

        setFeedback({
            show: true,
            correct: isCorrect,
            message: isCorrect ? 'Correct.' : 'Incorrect.',
        });

        if (isCorrect) {
            setTimeout(() => {
                handleContinue();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);
        }
    };

    const handleContinue = () => {
        setPendingAnswer(prev => {
            if (!prev) return null; // already handled → do nothing

            setProgress(progress => {
                if (!progress) return progress;

                const { queue, graduatedVocabId } =
                    SRSService.applyAnswer(progress.activeQueue, 0, prev.isCorrect);

                let learnedWords = progress.learnedWords;
                let totalLearned = progress.stats.totalLearned;

                if (graduatedVocabId) {
                    learnedWords = new Set(progress.learnedWords);
                    learnedWords.add(graduatedVocabId);
                    totalLearned += 1;
                }

                const cleanedQueue = SRSService.cleanupAndRefill(
                    queue,
                    progress.knownKanjiCount,
                    learnedWords
                );

                return {
                    ...progress,
                    activeQueue: cleanedQueue,
                    learnedWords,
                    stats: {
                        ...progress.stats,
                        totalReviews: progress.stats.totalReviews + 1,
                        totalLearned,
                    },
                };
            });

            return null; // consume the pending answer
        });

        console.debug('set feedback null')
        setFeedback(null);
    };

    const handleReset = () => {
        StorageService.clearProgress();
        setProgress(null);
        setIsSetup(true);
        setFeedback(null);
    };

    if (isSetup) {
        return <SetupScreen onComplete={handleSetupComplete} />;
    }

    if (!progress || progress.activeQueue.length === 0) {
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
                        borderColor: THEME.colors.divider
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
                        onClick={handleReset}
                        className="font-medium py-2 px-6 rounded transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accentHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accent}
                    >
                        Reset progress
                    </button>
                </div>
            </div>
        );
    }

    const currentProgress = progress.activeQueue[0]
    const currentVocab = SAMPLE_VOCABULARY.find(v => v.id === currentProgress.vocabId);

    if (!currentVocab) return null;

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
                    onClick={handleReset}
                    className="text-xs transition-colors"
                    style={{
                        color: THEME.colors.secondary,
                        fontFamily: THEME.fonts.gothic,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = THEME.colors.primary}
                    onMouseLeave={(e) => e.currentTarget.style.color = THEME.colors.secondary}
                >
                    Reset
                </button>
            </div>

            <ProgressBar progress={progress} />

            <QuizCard
                vocabulary={currentVocab}
                progress={currentProgress}
                onSubmit={handleAnswer}
                onContinue={handleContinue}
                feedback={feedback}
            />
        </div>
    );
}
