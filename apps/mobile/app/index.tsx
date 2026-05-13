import { QuizScreen } from '@gokan-srs/app/pages/quiz/QuizScreen';
import { useAppNavigation } from '@gokan-srs/app/context/NavigationContext';

export default function Index() {
    const navigation = useAppNavigation();
    return <QuizScreen onVocabClick={(id) => navigation.navigate(`/vocab/${id}`)} />;
}
