import { Button } from "../../components/ui/Button";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useQuiz } from "../../context/useQuiz";
import { CONSTANTS } from "../../commons/constants";
import { DEFAULT_SETTINGS } from "../../models/user.model";
import { ArrowLeft } from "lucide-react";

export function UserProfileScreen({ onBack }: { onBack: () => void; onVocabClick?: (vocabId: string) => void }) {
    const { state, actions } = useQuiz();

    const countStep = state.settings?.kanjiCountStep ?? CONSTANTS.setup.defaultKanjiCountStep;

    // The stepper's increment is a persisted preference, so it survives a reload
    // and follows the user across devices like every other setting.
    const handleCountStepChange = (step: number) => {
        actions.saveSettings({ ...(state.settings ?? DEFAULT_SETTINGS), kanjiCountStep: step });
    };

    return (
        <div className="w-full max-w-2xl md:max-w-3xl flex flex-col gap-2 animate-fade-in">
            {/* ... header ... */}
            <header className="w-full mb-6 flex items-center justify-center relative h-12">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute left-0"
                >
                    <ArrowLeft className="inline-block w-4 h-4 mr-1 align-text-bottom" aria-hidden="true" />Back
                </Button>

                <h1 className="text-xl font-serif text-primary">
                    Your learning
                </h1>
            </header>

            <section className="w-full mt-8">
                <h2 className="text-lg mb-4 text-primary font-serif">
                    Kanji
                </h2>

                <KanjiKnowledgeEditor
                    onKanjiKnowledgeChange={actions.updateKanjiKnowledge}
                    countStep={countStep}
                    onCountStepChange={handleCountStepChange}
                    gridHeight="36rem"
                />

            </section>


        </div>
    );
}
