import React, { useState } from 'react';
import './App.css';
import { SetupScreen } from './pages/setup/SetupScreen';
import { Logo } from './components/Logo';
import { SettingsScreen } from "./pages/settings/Settings";
import { Settings, User } from 'lucide-react';
import { QuizScreen } from "./pages/quiz/QuizScreen";
import { useQuiz } from "./context/useQuiz";
import { KanjiFormProvider } from "./context/KanjiForm/KanjiFormProvider";
import { UserProfileScreen } from "./pages/profile/UserProfileScreen";
import { useGoogleDrive } from "./context/GoogleDriveContext";
import { Cloud, RefreshCw } from "lucide-react";
import { Loader } from "./components/Loader";
import { AboutScreen } from "./pages/about/AboutScreen";
import { VocabDetailScreen } from "./pages/vocab/VocabDetailScreen";
import { VocabularyService } from "./services/vocabulary.service";
import type { Vocabulary } from "./models/vocabulary.model";
import { ResponsiveProvider } from "./context/Responsive/ResponsiveProvider";

export type Screen = "quiz" | "settings" | "profile" | "about" | "vocab-detail";

function SyncStatusIndicator() {
    const { isSyncing, isAuthenticated } = useGoogleDrive();

    if (!isAuthenticated) return null;

    if (isSyncing) {
        return <RefreshCw size={18} className="animate-spin text-gray-400" />;
    }

    return (
        <div className="text-green-500" title="Synced with Google Drive">
            <Cloud size={18} />
        </div>
    );
}

export const App: React.FC = () => {
    const { state, actions, isSetupComplete } = useQuiz();
    const { isInitialSyncComplete } = useGoogleDrive();

    // Simple routing based on URL hash
    const getScreenFromHash = (): Screen => {
        const hash = window.location.hash.slice(1); // Remove #
        if (hash === 'about' || hash === 'settings' || hash === 'profile') {
            return hash as Screen;
        }
        return 'quiz';
    };

    const [screen, setScreen] = useState<Screen>(getScreenFromHash());
    const [selectedVocabId, setSelectedVocabId] = useState<string | null>(null);
    const [selectedVocab, setSelectedVocab] = useState<Vocabulary | null>(null);

    // Update URL when screen changes
    const navigateTo = (newScreen: Screen) => {
        setScreen(newScreen);
        window.location.hash = newScreen === 'quiz' ? '' : newScreen;
    };

    const navigateToVocab = async (vocabId: string) => {
        const vocab = await VocabularyService.loadVocab(vocabId);
        setSelectedVocabId(vocabId);
        setSelectedVocab(vocab);
        setScreen('vocab-detail');
    };

    // Listen for browser back/forward
    React.useEffect(() => {
        const handleHashChange = () => {
            setScreen(getScreenFromHash());
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Show sync loader if initial sync is in progress
    if (!isInitialSyncComplete) {
        return <Loader title="Syncing your progress..." description="進捗を同期中..." />;
    }

    // Fatal Error Gate
    if (state.fatalError) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-red-50 p-8 text-center text-red-900">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold mb-2">System Error</h1>
                <p className="max-w-md mb-6">{state.fatalError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                    Reload Application
                </button>
            </div>
        );
    }

    // Setup gate
    if (!isSetupComplete) {
        return <KanjiFormProvider initialState={{}}>
            <SetupScreen onComplete={actions.setupComplete} />;
        </KanjiFormProvider>
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-background transition-colors duration-200">
            {/* Top bar */}
            <header className={'flex flex-row gap-3 p-4 md:p-8'}>
                <div>
                    <Logo />
                </div>
                <div className={'grow'}></div>

                <div className="flex gap-4 items-center">
                    <SyncStatusIndicator />
                    <button onClick={() => navigateTo("profile")} title="User Profile">
                        <User size={18} />
                    </button>
                    <button onClick={() => navigateTo("settings")} title="Settings">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            {/* Screen content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-0">
                {screen === "quiz" && (
                    <ResponsiveProvider>
                        <QuizScreen onVocabClick={navigateToVocab} />
                    </ResponsiveProvider>
                )}
                {screen === "about" && (
                    <ResponsiveProvider>
                        <AboutScreen onBack={() => navigateTo("quiz")} />
                    </ResponsiveProvider>
                )}
                {screen === "settings" && (
                    <SettingsScreen
                        settings={state.settings!}
                        onUpdateSettings={actions.saveSettings}
                        onReset={actions.reset}
                        onBack={() => navigateTo("quiz")}
                    />
                )}
                {screen === "profile" && (
                    <KanjiFormProvider initialState={{
                        kanjiCount: state.progress!.kanjiKnowledge.step,
                        kanjiMethod: state.progress!.kanjiKnowledge.method,
                        knownKanji: state.progress!.kanjiKnowledge.kanjiSet
                    }}>
                        <UserProfileScreen onBack={() => navigateTo("quiz")} onVocabClick={navigateToVocab} />
                    </KanjiFormProvider>
                )}
                {screen === "vocab-detail" && selectedVocab && (
                    <ResponsiveProvider>
                        <VocabDetailScreen
                            vocab={selectedVocab}
                            progress={state.progress?.learningQueue.find(p => p.vocabId === selectedVocabId!)}
                            onBack={() => navigateTo('quiz')}
                        />
                    </ResponsiveProvider>
                )}
            </div>

            {/* Footer with About link */}
            {screen === "quiz" && (
                <footer className="p-4 text-center">
                    <button
                        onClick={() => navigateTo("about")}
                        className="text-xs text-secondary hover:text-primary transition-colors"
                    >
                        About Gokan SRS
                    </button>
                </footer>
            )}
        </div>
    );
};
