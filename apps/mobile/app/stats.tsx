import { StatsScreen } from '@gokan-srs/app/pages/stats/StatsScreen';
import { useAppNavigation } from '@gokan-srs/app/context/NavigationContext';

export default function Stats() {
    const navigation = useAppNavigation();
    return <StatsScreen onBack={() => navigation.goBack()} onVocabClick={(id) => navigation.navigate(`/vocab/${id}`)} />;
}
