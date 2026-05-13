import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SourceSerif4_400Regular, SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4';
import { NotoSerifJP_400Regular, NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp';
import { SawarabiGothic_400Regular } from '@expo-google-fonts/sawarabi-gothic';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { createNativeFetchAdapter } from '../src/services/fetch.adapter.native';

GoogleSignin.configure({
    webClientId: '1088130501377-pe580cj85dt179hltgba6v153m12esmh.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

VocabularyService.configure(createNativeFetchAdapter());

import { QuizProvider } from '@gokan-srs/app/context/QuizContext';
import { ResponsiveProvider } from '@gokan-srs/app/context/Responsive/ResponsiveProvider';
import { ThemeProvider } from '@gokan-srs/app/context/ThemeContext';
import { GoogleDriveProvider } from '../src/context/GoogleDriveContext.native';
import { NavigationContext } from '@gokan-srs/app/context/NavigationContext';
import { useRouter, useSegments } from 'expo-router';

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

    const router = useRouter();
    const segments = useSegments();

    if (!fontsLoaded) {
        return null;
    }

    const navigationValue = {
        navigate: (path: string) => {
            // Expo router path mapping
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
            // Extract from segments or return undefined.
            // For /vocab/[id], segments = ['vocab', 'id']
            if (key === 'vocabId' && segments[0] === 'vocab') {
                return segments[1];
            }
            return undefined;
        }
    };

    return (
        <NavigationContext.Provider value={navigationValue}>
            <ThemeProvider defaultTheme="system" storageKey="gokan-theme">
                <GoogleDriveProvider>
                    <ResponsiveProvider>
                        <QuizProvider>
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="stats" />
                                <Stack.Screen name="profile" />
                                <Stack.Screen name="settings" />
                                <Stack.Screen name="about" />
                                <Stack.Screen name="vocab/[id]" />
                            </Stack>
                        </QuizProvider>
                    </ResponsiveProvider>
                </GoogleDriveProvider>
            </ThemeProvider>
        </NavigationContext.Provider>
    );
}
