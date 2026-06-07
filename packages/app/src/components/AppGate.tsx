import React from 'react';
import { KanjiFormProvider } from '../context/KanjiForm/KanjiFormProvider';
import { OnboardingFlow } from '../pages/setup/OnboardingFlow';
import { Loader } from './Loader';
import { useQuiz } from '../context/useQuiz';
import { useGoogleDrive } from '../context/GoogleDriveContext';

interface AppGateProps {
    children: React.ReactNode;
}

/**
 * Shared gate component used by both web and mobile root layouts.
 * Blocks rendering until Google Drive sync completes, then redirects to
 * OnboardingFlow when no user progress exists yet.
 * Must be rendered inside QuizProvider and GoogleDriveProvider.
 */
export function AppGate({ children }: AppGateProps) {
    const { actions, isSetupComplete } = useQuiz();
    const { isInitialLoadComplete, isDownloading } = useGoogleDrive();

    if (!isInitialLoadComplete || isDownloading) {
        return <Loader title="Syncing your progress..." description="進捗を同期中..." />;
    }

    if (!isSetupComplete) {
        return (
            <KanjiFormProvider initialState={{}}>
                <OnboardingFlow onComplete={actions.setupComplete} />
            </KanjiFormProvider>
        );
    }

    return <>{children}</>;
}
