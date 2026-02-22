import { useState } from "react";
import { CONSTANTS } from "../../commons/constants";
import type { LearningOrder } from "../../models/user.model";
import { OptionGrid } from "../../components/OptionGrid";
import { SetupHeader } from "../../components/SetupHeader";
import type { SetupValues } from "../../models/state.model";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useKanjiForm } from "../../context/KanjiForm/useKanjiForm";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/Loader";

export function SetupScreen({ onComplete }: { onComplete: (values: SetupValues) => Promise<void> }) {
    const { state } = useKanjiForm();

    const [learningOrder, setLearningOrder] = useState<LearningOrder>('frequency');

    const handleSubmit = () => {
        if (
            state.kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            state.kanjiCount <= CONSTANTS.setup.maximumKanjiCount
        ) {
            const values: SetupValues = {
                kanjiKnowledge: {
                    method: state.kanjiMethod,
                    step: state.kanjiCount,
                    kanjiSet: new Set(state.knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                    enableMeaningQuiz: true, // Default to true
                },
            }
            onComplete(values).then();
        }
    };

    if (state.loading) {
        return (<Loader title="Loading..." />)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background transition-colors duration-200">
            <div className="w-full max-w-2xl md:max-w-3xl mx-auto p-8 space-y-12">
                <SetupHeader />

                <KanjiKnowledgeEditor />

                <OptionGrid<LearningOrder>
                    title="Vocabulary order"
                    value={learningOrder}
                    onChange={setLearningOrder}
                    options={[
                        {
                            value: 'frequency',
                            label: 'Frequency',
                            description: 'Most common words first',
                        },
                        {
                            value: 'kklc',
                            label: 'By Kanji',
                            description: 'Follow kanji progression',
                        },
                    ]}
                />

                <footer className="pt-4 space-y-4">
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!state.knownKanji}
                        className="w-full py-4 text-lg font-serif h-14"
                    >
                        Start learning
                    </Button>

                </footer>
            </div>
        </div>
    );
}
