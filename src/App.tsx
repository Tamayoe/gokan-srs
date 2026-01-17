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

export type Screen = "quiz" | "settings" | "profile";

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
    const [screen, setScreen] = useState<Screen>("quiz");

    // Setup gate
    if (!isSetupComplete) {
        return <KanjiFormProvider initialState={{}}>
            <SetupScreen onComplete={actions.setupComplete} />;
        </KanjiFormProvider>
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-background transition-colors duration-200">
            {/* Top bar */}
            <div className="absolute top-6 left-6">
                <Logo />
            </div>

            <div className="absolute top-6 right-6 flex gap-4 items-center">
                <SyncStatusIndicator />
                <button onClick={() => setScreen("profile")}>
                    <User size={18} />
                </button>
                <button onClick={() => setScreen("settings")}>
                    <Settings size={18} />
                </button>
            </div>

            {/* Screen content */}
            <div className="flex-1 flex items-center justify-center p-8">
                {screen === "quiz" && <QuizScreen />}
                {screen === "settings" && (
                    <SettingsScreen
                        settings={state.settings!}
                        onUpdateSettings={actions.saveSettings}
                        onReset={actions.reset}
                        onBack={() => setScreen("quiz")}
                    />
                )}
                {screen === "profile" && (
                    <KanjiFormProvider initialState={{
                        kanjiCount: state.progress!.kanjiKnowledge.step,
                        kanjiMethod: state.progress!.kanjiKnowledge.method,
                        knownKanji: state.progress!.kanjiKnowledge.kanjiSet
                    }}>
                        <UserProfileScreen onBack={() => setScreen("quiz")} />
                    </KanjiFormProvider>
                )}
            </div>
        </div>
    );
};
