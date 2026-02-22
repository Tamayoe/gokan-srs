import React, { Suspense, lazy } from 'react';
import './App.css';
import { OnboardingFlow } from './pages/setup/OnboardingFlow';
import { Logo } from './components/Logo';
import { Settings, User, Cloud, RefreshCw, BarChart2 } from 'lucide-react';
import { useQuiz } from "./context/useQuiz";
import { KanjiFormProvider } from "./context/KanjiForm/KanjiFormProvider";
import { useGoogleDrive } from "./context/GoogleDriveContext";
import { Loader } from "./components/Loader";
import { ResponsiveProvider } from "./context/Responsive/ResponsiveProvider";
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// Lazy Load Pages
// Note: Adapting named exports to default exports for lazy loading where necessary
const QuizScreen = lazy(() => import('./pages/quiz/QuizScreen').then(module => ({ default: module.QuizScreen })));
const SettingsScreen = lazy(() => import('./pages/settings/Settings').then(module => ({ default: module.SettingsScreen })));
const UserProfileScreen = lazy(() => import('./pages/profile/UserProfileScreen').then(module => ({ default: module.UserProfileScreen })));
const StatsScreen = lazy(() => import('./pages/stats/StatsScreen').then(module => ({ default: module.StatsScreen }))); // START_ADD (conceptually)
const AboutScreen = lazy(() => import('./pages/about/AboutScreen').then(module => ({ default: module.AboutScreen })));
const VocabDetailScreen = lazy(() => import('./pages/vocab/VocabDetailScreen'));

function SyncStatusIndicator() {
    const { isUploading, isDownloading, isAuthenticated } = useGoogleDrive();

    if (!isAuthenticated) return null;

    if (isUploading || isDownloading) {
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
    const { isInitialLoadComplete, isDownloading } = useGoogleDrive();
    const navigate = useNavigate();
    const location = useLocation();

    // Show sync loader if initial sync is in progress or manual download is happening
    if (!isInitialLoadComplete || isDownloading) {
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
            <OnboardingFlow onComplete={actions.setupComplete} />
        </KanjiFormProvider>
    }

    const isQuizScreen = location.pathname === '/';

    return (
        <div className="min-h-screen flex flex-col relative bg-background transition-colors duration-200">
            {/* Top bar */}
            <header className={'flex flex-row gap-3 p-4 md:p-8'}>
                <div onClick={() => navigate('/')} className="cursor-pointer">
                    <Logo />
                </div>
                <div className={'grow'}></div>

                <div className="flex gap-4 items-center">
                    <SyncStatusIndicator />
                    <button onClick={() => navigate("/stats")} title="Statistics" className="cursor-pointer text-secondary hover:text-primary transition-colors">
                        <BarChart2 size={18} />
                    </button>
                    <button onClick={() => navigate("/profile")} title="User Profile" className="cursor-pointer text-secondary hover:text-primary transition-colors">
                        <User size={18} />
                    </button>
                    <button onClick={() => navigate("/settings")} title="Settings" className="cursor-pointer text-secondary hover:text-primary transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            {/* Screen content */}
            <div className={`flex-1 flex flex-col items-center p-4 md:p-0 ${isQuizScreen ? 'justify-center' : 'justify-start'}`}>
                <Suspense fallback={<Loader title="Loading..." />}>
                    <Routes>
                        <Route path="/" element={
                            <ResponsiveProvider>
                                <QuizScreen onVocabClick={(id) => navigate(`/vocab/${id}`)} />
                            </ResponsiveProvider>
                        } />
                        <Route path="/stats" element={
                            <StatsScreen
                                onBack={() => navigate('/')}
                                onVocabClick={(id) => navigate(`/vocab/${id}`)}
                            />
                        } />
                        <Route path="/about" element={
                            <ResponsiveProvider>
                                <AboutScreen onBack={() => navigate('/')} />
                            </ResponsiveProvider>
                        } />
                        <Route path="/settings" element={
                            <SettingsScreen
                                settings={state.settings!}
                                onUpdateSettings={actions.saveSettings}
                                onReset={actions.reset}
                                onBack={() => navigate('/')}
                            />
                        } />
                        <Route path="/profile" element={
                            <KanjiFormProvider initialState={{
                                kanjiCount: state.progress!.kanjiKnowledge.step,
                                kanjiMethod: state.progress!.kanjiKnowledge.method,
                                knownKanji: state.progress!.kanjiKnowledge.kanjiSet
                            }}>
                                <UserProfileScreen
                                    onBack={() => navigate('/')}
                                    onVocabClick={(id) => navigate(`/vocab/${id}`)}
                                />
                            </KanjiFormProvider>
                        } />
                        <Route path="/vocab/:vocabId" element={
                            <ResponsiveProvider>
                                <VocabDetailScreen />
                            </ResponsiveProvider>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </div>

            {/* Footer with About link - only shown on Quiz Screen */}
            {isQuizScreen && (
                <footer className="p-4 text-center">
                    <button
                        onClick={() => navigate("/about")}
                        className="text-xs text-secondary hover:text-primary transition-colors"
                    >
                        About Gokan SRS
                    </button>
                </footer>
            )}
        </div>
    );
};
