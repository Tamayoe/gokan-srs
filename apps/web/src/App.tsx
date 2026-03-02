import React, { Suspense, lazy } from 'react';
import { View, Text, Pressable, Platform, ScrollView } from 'react-native';
import './App.css';
import { OnboardingFlow } from './pages/setup/OnboardingFlow';
import { Logo } from './components/Logo';
import { Settings, Cloud, RefreshCw, BarChart2 } from 'lucide-react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuiz } from "./context/useQuiz";
import { KanjiFormProvider } from "./context/KanjiForm/KanjiFormProvider";
import { useGoogleDrive } from "./context/GoogleDriveContext";
import { Loader } from "./components/Loader";
import { ResponsiveProvider } from "./context/Responsive/ResponsiveProvider";
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { THEME, styles } from '@gokan-srs/ui';

// Lazy Load Pages
const QuizScreen = lazy(() => import('./pages/quiz/QuizScreen').then(module => ({ default: module.QuizScreen })));
const SettingsScreen = lazy(() => import('./pages/settings/Settings').then(module => ({ default: module.SettingsScreen })));
const UserProfileScreen = lazy(() => import('./pages/profile/UserProfileScreen').then(module => ({ default: module.UserProfileScreen })));
const StatsScreen = lazy(() => import('./pages/stats/StatsScreen').then(module => ({ default: module.StatsScreen })));
const AboutScreen = lazy(() => import('./pages/about/AboutScreen').then(module => ({ default: module.AboutScreen })));
const VocabDetailScreen = lazy(() => import('./pages/vocab/VocabDetailScreen').then(module => ({ default: module.default })));

function SyncStatusIndicator() {
    const { isUploading, isDownloading, isAuthenticated } = useGoogleDrive();

    if (!isAuthenticated) return null;

    if (isUploading || isDownloading) {
        return <MaterialCommunityIcons name="loading" size={18} color={THEME.colors.tertiary} style={{ opacity: 0.5 }} />;
    }

    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <MaterialCommunityIcons name="cloud-check" size={18} color="#22c55e" /> {/* green-500 equivalent */}
        </View>
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
            <View style={[styles.flex1, styles.flexCol, styles.alignCenter, styles.justifyCenter, styles.p8, { backgroundColor: '#fef2f2' }]}>
                <Text style={[{ fontSize: 40 }, styles.mb4]}>⚠️</Text>
                <Text style={[styles.text2xl, styles.fontBold, styles.mb2, { color: '#7f1d1d' }]}>System Error</Text>
                <Text style={[styles.textCenter, styles.mb6, { color: '#7f1d1d', maxWidth: 440 }]}>{state.fatalError}</Text>
                <Pressable
                    onPress={() => window.location.reload()}
                    style={({ pressed }: any) => [
                        styles.px4, styles.py2, { borderRadius: 4, backgroundColor: pressed ? '#b91c1c' : '#dc2626' }
                    ] as any}
                >
                    <Text style={[styles.textWhite]}>Reload Application</Text>
                </Pressable>
            </View>
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
        <View style={[styles.flex1, styles.flexCol, styles.relative, styles.bgBackground]}>
            {/* Top bar */}
            <View style={[styles.flexRow, styles.p4, { paddingHorizontal: 32 }]}>
                <Pressable onPress={() => navigate('/')}>
                    <Logo />
                </Pressable>

                <View style={styles.flexGrow} />

                <View style={[styles.flexRow, styles.alignCenter, styles.gap4]}>
                    <SyncStatusIndicator />
                    <Pressable onPress={() => navigate("/stats")} style={({ pressed, hovered }: any) => [{ opacity: pressed || hovered ? 1 : 0.7 }] as any}>
                        <MaterialCommunityIcons name="chart-bar" size={24} color={THEME.colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => navigate("/profile")} style={({ pressed, hovered }: any) => [{ opacity: pressed || hovered ? 1 : 0.7, justifyContent: 'center', alignItems: 'center' }] as any}>
                        <Text style={{ fontFamily: 'Noto Serif JP', fontWeight: 'bold', fontSize: 18, color: THEME.colors.primary, lineHeight: 24 }}>漢</Text>
                    </Pressable>
                    <Pressable onPress={() => navigate("/settings")} style={({ pressed, hovered }: any) => [{ opacity: pressed || hovered ? 1 : 0.7 }] as any}>
                        <MaterialCommunityIcons name="cog" size={24} color={THEME.colors.primary} />
                    </Pressable>
                </View>
            </View>

    {/* Screen content */ }
    < View style = { [styles.flex1, styles.flexCol, styles.alignCenter, styles.p0, isQuizScreen ? styles.justifyCenter : styles.justifyStart]} >
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
            </View >

    {/* Footer with About link - only shown on Quiz Screen */ }
{
    isQuizScreen && (
                <View style={[styles.p4, styles.alignCenter]}>
                    <Pressable onPress={() => navigate("/about")} style={({ pressed, hovered }: any) => [{ opacity: pressed || hovered ? 1 : 0.7 }] as any}>
                        <Text style={[styles.textXs, styles.textSecondary]}>
                            About Gokan SRS
                        </Text>
                    </Pressable>
                </View>
    )
}
        </View >
    );
};
