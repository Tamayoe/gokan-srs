import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SourceSerif4_400Regular, SourceSerif4_700Bold } from '@expo-google-fonts/source-serif-4';
import { NotoSerifJP_400Regular, NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp';
import { SawarabiGothic_400Regular } from '@expo-google-fonts/sawarabi-gothic';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
    webClientId: '1088130501377-pe580cj85dt179hltgba6v153m12esmh.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

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

    if (!fontsLoaded) {
        return null;
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Gokan SRS' }} />
        </Stack>
    );
}
