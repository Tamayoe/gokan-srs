import { useState } from "react";
import type { SetupValues } from "../../models/state.model";
import { WelcomeScreen } from "./WelcomeScreen";
import { SetupScreen } from "./SetupScreen";

interface OnboardingFlowProps {
    onComplete: (values: SetupValues) => Promise<void>;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [step, setStep] = useState<'welcome' | 'setup'>('welcome');

    const handleSelectBeginner = () => {
        // Fast-track for complete beginners
        const values: SetupValues = {
            kanjiKnowledge: {
                method: 'kklc', // Default to KKLC to learn kanji in order
                step: 0,
                kanjiSet: new Set(),
            },
            settings: {
                preferredLearningOrder: 'kklc', // Start with words using kanji they learn
                enableMeaningQuiz: true,
                enableGeminiContext: false, // Default standard validations
            },
        };
        onComplete(values).catch(console.error);
    };

    if (step === 'welcome') {
        return (
            <WelcomeScreen
                onSelectBeginner={handleSelectBeginner}
                onSelectLearner={() => setStep('setup')}
            />
        );
    }

    if (step === 'setup') {
        return (
            <SetupScreen onComplete={onComplete} />
        );
    }

    return null;
}
