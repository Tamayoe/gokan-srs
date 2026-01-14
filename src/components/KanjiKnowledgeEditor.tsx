import {OptionGrid} from "./OptionGrid";
import {KanjiCountInput} from "./KanjiCountInput";
import {KanjiField} from "./KanjiField";
import type {KanjiKnowledge, KanjiLearningMethod} from "../models/user.model";
import {useKanjiForm} from "../context/KanjiForm/useKanjiForm";
import {useEffect} from "react";

export function KanjiKnowledgeEditor({
    onKanjiKnowledgeChange
}: { onKanjiKnowledgeChange?: (knowledge: KanjiKnowledge) => void }) {
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

            <KanjiCountInput />

            <KanjiField allKanji={state.allKanji}/>
        </>
    );
}
