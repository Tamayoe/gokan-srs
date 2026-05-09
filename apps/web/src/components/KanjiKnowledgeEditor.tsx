import { useEffect } from "react";
import { View } from "react-native";
import { OptionGrid } from "./OptionGrid";
import { KanjiCountInput } from "./KanjiCountInput";
import { KanjiField } from "./KanjiField";
import type { KanjiKnowledge, KanjiLearningMethod } from "@gokan-srs/core/models/user.model";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";

export function KanjiKnowledgeEditor({
    onKanjiKnowledgeChange
}: { onKanjiKnowledgeChange?: (knowledge: KanjiKnowledge) => void }) {
    const { state } = useKanjiForm();

    useEffect(() => {
        if (onKanjiKnowledgeChange) {
            onKanjiKnowledgeChange({
                step: state.kanjiCount,
                method: state.kanjiMethod,
                kanjiSet: state.knownKanji,
            });
        }
    }, [state.kanjiMethod, state.kanjiCount, state.knownKanji, onKanjiKnowledgeChange]);

    return (
        <View>
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
            <KanjiField allKanji={state.allKanji} />
        </View>
    );
}
