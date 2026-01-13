import {useState} from "react";
import {THEME} from "../../commons/theme";
import {CONSTANTS} from "../../commons/constants";
import type {LearningOrder} from "../../models/user.model";
import {OptionGrid} from "../../components/OptionGrid";
import {SetupHeader} from "../../components/SetupHeader";
import type {SetupValues} from "../../models/state.model";
import {KanjiKnowledgeEditor} from "../../components/KanjiKnowledgeEditor";
import {useKanjiForm} from "../../context/KanjiForm/useKanjiForm";

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
                }
            }
            onComplete(values).then();
        }
    };

    if (state.loading) {
        return (<p>Loading...</p>)
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >
            <div className="max-w-3xl mx-auto p-8 space-y-12">
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

                <footer className="pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!state.knownKanji}
                        className="w-full rounded-lg py-4 text-lg transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }}
                    >
                        Start learning
                    </button>
                </footer>
            </div>
        </div>
    );
}
