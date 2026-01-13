import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { THEME } from "../../commons/theme";
import { CONSTANTS } from "../../commons/constants";
import { OptionGrid } from "../../components/OptionGrid";
import { SetupHeader } from "../../components/SetupHeader";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useKanjiForm } from "../../context/KanjiForm/useKanjiForm";
export function SetupScreen({ onComplete }) {
    const { state } = useKanjiForm();
    const [learningOrder, setLearningOrder] = useState('frequency');
    const handleSubmit = () => {
        if (state.kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            state.kanjiCount <= CONSTANTS.setup.maximumKanjiCount) {
            const values = {
                kanjiKnowledge: {
                    method: state.kanjiMethod,
                    step: state.kanjiCount,
                    kanjiSet: new Set(state.knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                }
            };
            onComplete(values).then();
        }
    };
    if (state.loading) {
        return (_jsx("p", { children: "Loading..." }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-8", style: { backgroundColor: THEME.colors.background }, children: _jsxs("div", { className: "max-w-3xl mx-auto p-8 space-y-12", children: [_jsx(SetupHeader, {}), _jsx(KanjiKnowledgeEditor, {}), _jsx(OptionGrid, { title: "Vocabulary order", value: learningOrder, onChange: setLearningOrder, options: [
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
                    ] }), _jsx("footer", { className: "pt-4", children: _jsx("button", { onClick: handleSubmit, disabled: !state.knownKanji, className: "w-full rounded-lg py-4 text-lg transition-colors", style: {
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Start learning" }) })] }) }));
}
