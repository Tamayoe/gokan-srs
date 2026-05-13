import { UserProfileScreen } from '@gokan-srs/app/pages/profile/UserProfileScreen';
import { KanjiFormProvider } from '@gokan-srs/app/context/KanjiForm/KanjiFormProvider';
import { useQuiz } from '@gokan-srs/app/context/useQuiz';
import { useAppNavigation } from '@gokan-srs/app/context/NavigationContext';

export default function Profile() {
    const { state } = useQuiz();
    const navigation = useAppNavigation();

    if (!state.progress) return null;

    return (
        <KanjiFormProvider initialState={{
            kanjiCount: state.progress.kanjiKnowledge.step,
            kanjiMethod: state.progress.kanjiKnowledge.method,
            knownKanji: state.progress.kanjiKnowledge.kanjiSet
        }}>
            <UserProfileScreen
                onBack={() => navigation.goBack()}
                onVocabClick={(id) => navigation.navigate(`/vocab/${id}`)}
            />
        </KanjiFormProvider>
    );
}
