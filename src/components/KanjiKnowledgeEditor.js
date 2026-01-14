import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { OptionGrid } from "./OptionGrid";
import { KanjiCountInput } from "./KanjiCountInput";
import { KanjiField } from "./KanjiField";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
import { useEffect } from "react";
export function KanjiKnowledgeEditor({ onKanjiKnowledgeChange }) {
    const { state } = useKanjiForm();
    if (onKanjiKnowledgeChange) {
        useEffect(() => {
            onKanjiKnowledgeChange({
                step: state.kanjiCount,
                method: state.kanjiMethod,
                kanjiSet: state.knownKanji,
            });
        }, [state.kanjiMethod, state.kanjiCount, state.knownKanji]);
    }
    return (_jsxs(_Fragment, { children: [_jsx(OptionGrid, { title: "Kanji learning method", value: state.kanjiMethod, options: [
                    {
                        value: 'kklc',
                        label: 'KKLC',
                        description: 'Traditional school-based order',
                    },
                ] }), _jsx(KanjiCountInput, {}), _jsx(KanjiField, { allKanji: state.allKanji })] }));
}
