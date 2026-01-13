import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { OptionGrid } from "./OptionGrid";
import { KanjiCountInput } from "./KanjiCountInput";
import { KanjiField } from "./KanjiField";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
export function KanjiKnowledgeEditor() {
    const { state } = useKanjiForm();
    return (_jsxs(_Fragment, { children: [_jsx(OptionGrid, { title: "Kanji learning method", value: state.kanjiMethod, options: [
                    {
                        value: 'kklc',
                        label: 'KKLC',
                        description: 'Traditional school-based order',
                    },
                ] }), _jsx(KanjiCountInput, {}), _jsx(KanjiField, { allKanji: state.allKanji })] }));
}
