import { SettingsScreen } from '@gokan-srs/app/pages/settings/Settings';
import { useQuiz } from '@gokan-srs/app/context/useQuiz';
import { useAppNavigation } from '@gokan-srs/app/context/NavigationContext';

export default function Settings() {
    const { state, actions } = useQuiz();
    const navigation = useAppNavigation();

    if (!state.settings) return null;

    return (
        <SettingsScreen
            settings={state.settings}
            onUpdateSettings={actions.saveSettings}
            onReset={actions.reset}
            onBack={() => navigation.goBack()}
        />
    );
}
