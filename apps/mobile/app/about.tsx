import { AboutScreen } from '@gokan-srs/app/pages/about/AboutScreen';
import { useAppNavigation } from '@gokan-srs/app/context/NavigationContext';

export default function About() {
    const navigation = useAppNavigation();
    return <AboutScreen onBack={() => navigation.goBack()} />;
}
