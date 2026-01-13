import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import './App.css';
import { SetupScreen } from './pages/setup/SetupScreen';
import { THEME } from './commons/theme';
import { Logo } from './components/Logo';
import { SettingsScreen } from "./pages/settings/Settings";
import { Settings, User } from 'lucide-react';
import { QuizScreen } from "./pages/quiz/QuizScreen";
import { useQuiz } from "./context/useQuiz";
import { KanjiFormProvider } from "./context/KanjiForm/KanjiFormProvider";
export const App = () => {
    const { state, actions } = useQuiz();
    const [screen, setScreen] = useState("quiz");
    // Setup gate
    if (!state.isSetupComplete) {
        return _jsxs(KanjiFormProvider, { initialState: {}, children: [_jsx(SetupScreen, { onComplete: actions.setupComplete }), ";"] });
    }
    return (_jsxs("div", { className: "min-h-screen flex flex-col relative", style: { backgroundColor: THEME.colors.background }, children: [_jsx("div", { className: "absolute top-6 left-6", children: _jsx(Logo, {}) }), _jsxs("div", { className: "absolute top-6 right-6 flex gap-4", children: [_jsx("button", { onClick: () => setScreen("profile"), children: _jsx(User, { size: 18 }) }), _jsx("button", { onClick: () => setScreen("settings"), children: _jsx(Settings, { size: 18 }) })] }), _jsxs("div", { className: "flex-1 flex items-center justify-center p-8", children: [screen === "quiz" && _jsx(QuizScreen, {}), screen === "settings" && (_jsx(SettingsScreen, { settings: state.settings, onUpdateSettings: actions.saveSettings, onReset: actions.reset, onBack: () => setScreen("quiz") }))] })] }));
};
