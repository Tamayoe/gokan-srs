import { OptionGrid } from "./OptionGrid";
import { KanjiCountStepper } from "./KanjiCountStepper";
import { KanjiKnowledgeGrid } from "./KanjiKnowledgeGrid";
import type { KanjiKnowledge, KanjiLearningMethod } from "../models/user.model";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
import { CONSTANTS } from "../commons/constants";
import { useEffect } from "react";

interface KanjiKnowledgeEditorProps {
    onKanjiKnowledgeChange?: (knowledge: KanjiKnowledge) => void;
    /**
     * Increment for the count stepper's -/+ buttons. Supplied (with its setter)
     * by the profile page off UserSettings; omitted during setup, where no
     * settings object exists yet and the default increment stands.
     */
    countStep?: number;
    onCountStepChange?: (step: number) => void;
}

export function KanjiKnowledgeEditor({
    onKanjiKnowledgeChange,
    countStep,
    onCountStepChange,
}: KanjiKnowledgeEditorProps) {
    const { state } = useKanjiForm();

    if (onKanjiKnowledgeChange) {
        useEffect(() => {
            onKanjiKnowledgeChange({
                step: state.kanjiCount,
                method: state.kanjiMethod,
                kanjiSet: state.knownKanji,
            })
        }, [state.kanjiMethod, state.kanjiCount, state.knownKanji]);
    }

    return (
        <>
            <OptionGrid<KanjiLearningMethod>
                title="Kanji learning method"
                value={state.kanjiMethod}
                options={[
                    {
                        value: 'kklc',
                        label: 'KKLC',
                        description: 'Traditional school-based order',
                    },
                ]}
            />

            <KanjiCountStepper
                step={countStep ?? CONSTANTS.setup.defaultKanjiCountStep}
                onStepChange={onCountStepChange}
            />

            <KanjiKnowledgeGrid allKanji={state.allKanji} method={state.kanjiMethod} />
        </>
    );
}
