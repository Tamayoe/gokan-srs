import React, {useState} from 'react';
import './App.css';
import {SetupScreen} from './pages/setup/SetupScreen';
import {THEME} from './commons/theme';
import {Logo} from './components/Logo';
import {SettingsScreen} from "./pages/settings/Settings";
import {Settings, User} from 'lucide-react';
import {QuizScreen} from "./pages/quiz/QuizScreen";
import {useQuiz} from "./context/useQuiz";
import {KanjiFormProvider} from "./context/KanjiForm/KanjiFormProvider";

export type Screen = "quiz" | "settings" | "profile";

export const App: React.FC = () => {
    const { state, actions } = useQuiz();
    const [screen, setScreen] = useState<Screen>("quiz");

    // Setup gate
    if (!state.isSetupComplete) {
        return <KanjiFormProvider initialState={{}}>
            <SetupScreen onComplete={actions.setupComplete} />;
        </KanjiFormProvider>
    }

    return (
        <div
            className="min-h-screen flex flex-col relative"
            style={{ backgroundColor: THEME.colors.background }}
        >
            {/* Top bar */}
            <div className="absolute top-6 left-6">
                <Logo />
            </div>

            <div className="absolute top-6 right-6 flex gap-4">
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
                {/*{screen === "profile" && (*/}
                {/*    <UserProfileScreen onBack={() => setScreen("quiz")} />*/}
                {/*)}*/}
            </div>
        </div>
    );
};
