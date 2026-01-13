import {OptionGrid} from "./OptionGrid";
import {KanjiCountInput} from "./KanjiCountInput";
import {KanjiField} from "./KanjiField";
import type {KanjiLearningMethod} from "../models/user.model";
import {useKanjiForm} from "../context/KanjiForm/useKanjiForm";

export function KanjiKnowledgeEditor() {
    const { state } = useKanjiForm();

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
