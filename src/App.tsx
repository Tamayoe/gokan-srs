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

export default function App() {
    const [isSetup, setIsSetup] = useState(true);
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
    const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string } | null>(null);

    useEffect(() => {
        const saved = StorageService.loadProgress();
        if (saved) {
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
        if (!progress || progress.activeQueue.length === 0) return;

        const currentProgress = progress.activeQueue[currentVocabIndex];
        const currentVocab = SAMPLE_VOCABULARY.find(v => v.id === currentProgress.vocabId);

        if (!currentVocab) return;

        const isCorrect = QuizService.validateAnswer(answer, currentVocab.reading);
        const { newQueue, graduated } = SRSService.handleAnswer(
            currentProgress.vocabId,
            isCorrect,
            progress.activeQueue
        );

        const newProgress = { ...progress };
        newProgress.activeQueue = newQueue;
        newProgress.stats.totalReviews += 1;

        if (graduated) {
            newProgress.learnedWords.add(currentProgress.vocabId);
            newProgress.stats.totalLearned += 1;

            newProgress.activeQueue = SRSService.fillQueue(
                newProgress.activeQueue,
                newProgress.knownKanjiCount,
                newProgress.learnedWords
            );
        }

        setProgress(newProgress);

        const message = isCorrect
            ? graduated
                ? 'Word mastered.'
                : `Correct. (${currentProgress.correctCount + 1}/3)`
            : 'Incorrect.';

        setFeedback({ show: true, correct: isCorrect, message });

        setTimeout(() => {
            setFeedback(null);
            if (newProgress.activeQueue.length > 0) {
                setCurrentVocabIndex((currentVocabIndex + 1) % newProgress.activeQueue.length);
            }
        }, 1800);
    };

    const handleReset = () => {
        StorageService.clearProgress();
        setProgress(null);
        setIsSetup(true);
        setCurrentVocabIndex(0);
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
                <div
                    className="border rounded p-8 max-w-md w-full text-center"
                    style={{
                        backgroundColor: THEME.colors.surface,
                        borderColor: THEME.colors.divider
                    }}
                >
                    <h2
                        className="text-xl font-serif mb-4"
                        style={{ color: THEME.colors.primary }}
                    >
                        All vocabulary reviewed.
                    </h2>
                    <p
                        className="font-sans text-sm mb-6"
                        style={{ color: THEME.colors.secondary }}
                    >
                        No more words available for your current kanji level.
                    </p>
                    <button
                        onClick={handleReset}
                        className="font-sans font-medium py-2 px-6 rounded transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
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

    const currentProgress = progress.activeQueue[currentVocabIndex];
    const currentVocab = SAMPLE_VOCABULARY.find(v => v.id === currentProgress.vocabId);

    if (!currentVocab) return null;

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
                    onClick={handleReset}
                    className="text-xs font-sans transition-colors"
                    style={{ color: THEME.colors.secondary }}
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
                feedback={feedback}
            />
        </div>
    );
}
