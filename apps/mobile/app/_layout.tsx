import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SourceSerif4_400Regular, SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4';
import { NotoSerifJP_400Regular, NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp';
import { SawarabiGothic_400Regular } from '@expo-google-fonts/sawarabi-gothic';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useState, useEffect } from 'react';
import { View } from 'react-native';

import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { StorageService } from '@gokan-srs/core/services/storage.service';
import { createNativeFetchAdapter } from '../src/services/fetch.adapter.native';
import { mmkvStorageAdapter } from '../src/services/mmkv.adapter';
import { getDb } from '../src/services/sqlite.service';

GoogleSignin.configure({
    webClientId: '1088130501377-pe580cj85dt179hltgba6v153m12esmh.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

VocabularyService.configure(createNativeFetchAdapter());
StorageService.configure(mmkvStorageAdapter);

import { QuizProvider } from '@gokan-srs/app/context/QuizContext';
import { ResponsiveProvider } from '@gokan-srs/app/context/Responsive/ResponsiveProvider';
import { ThemeProvider } from '@gokan-srs/app/context/ThemeContext';
import { GoogleDriveProvider } from '../src/context/GoogleDriveContext.native';
import { NavigationContext } from '@gokan-srs/app/context/NavigationContext';
import { AppGate } from '@gokan-srs/app/components/AppGate';
import { Loader } from '@gokan-srs/app/components/Loader';
import { useRouter, useSegments } from 'expo-router';
import { THEME } from '@gokan-srs/ui';

export default function Layout() {
    const [fontsLoaded] = useFonts({
        SourceSerif4_400Regular,
        SourceSerif4_700Bold,
        NotoSerifJP_400Regular,
        NotoSerifJP_700Bold,
        SawarabiGothic_400Regular,
        NotoSansJP_400Regular,
        NotoSansJP_700Bold,
    });

    // Kick off SQLite initialisation immediately. On first launch this migrates
    // vocab from the bundled JSON into the database (~2-5 s one-time cost).
    const [dbReady, setDbReady] = useState(false);
    useEffect(() => {
        getDb()
            .then(() => setDbReady(true))
            .catch((err) => {
                console.error('SQLite init failed:', err);
                setDbReady(true); // Don't hard-block the app on DB failure
            });
    }, []);

    const router = useRouter();
    const segments = useSegments();

    if (!fontsLoaded || !dbReady) {
        // Show a styled loading screen while fonts load and/or the DB migrates
        return (
            <View style={{ flex: 1, backgroundColor: THEME.colors.background }}>
                <Loader
                    title="Preparing your study session…"
                    description="初回起動の準備中…"
                />
            </View>
        );
    }

    const navigationValue = {
        navigate: (path: string) => {
            router.push(path as any);
        },
        goBack: () => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/');
            }
        },
        getParam: (key: string) => {
            if (key === 'vocabId' && segments[0] === 'vocab') {
                return segments[1];
            }
            return undefined;
        },
    };

    return (
        <NavigationContext.Provider value={navigationValue}>
            <ThemeProvider defaultTheme="system" storageKey="gokan-theme">
                <GoogleDriveProvider>
                    <ResponsiveProvider>
                        <QuizProvider>
                            <AppGate>
                                <Stack screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="index" />
                                    <Stack.Screen name="stats" />
                                    <Stack.Screen name="profile" />
                                    <Stack.Screen name="settings" />
                                    <Stack.Screen name="about" />
                                    <Stack.Screen name="vocab/[id]" />
                                </Stack>
                            </AppGate>
                        </QuizProvider>
                    </ResponsiveProvider>
                </GoogleDriveProvider>
            </ThemeProvider>
        </NavigationContext.Provider>
    );
}
