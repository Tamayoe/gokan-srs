import { default as VocabDetailScreen } from '@gokan-srs/app/pages/vocab/VocabDetailScreen';
import { useLocalSearchParams } from 'expo-router';

export default function Vocab() {
    // Expo Router params
    const { id } = useLocalSearchParams<{ id: string }>();
    // The NavigationContext.getParam expects to be able to extract this, but in Expo router it's handled via useLocalSearchParams.
    // Our layout context gets it from segments.
    return <VocabDetailScreen />;
}
