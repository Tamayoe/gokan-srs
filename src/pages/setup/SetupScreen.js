import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { THEME } from "../../commons/theme";
import { CONSTANTS } from "../../commons/constants";
import { VocabularyService } from "../../services/vocabulary.service";
import { KanjiField } from "../../components/KanjiField";
import { OptionGrid } from "../../components/OptionGrid";
import { KanjiCountInput } from "../../components/KanjiCountInput";
import { SetupHeader } from "../../components/SetupHeader";
export function SetupScreen({ onComplete }) {
    const [kanjiCount, setKanjiCount] = useState(Number(CONSTANTS.setup.defaultKanjiCount));
    const [allKanji, setAllKanji] = useState([]);
    const [kanjiMethod, setKanjiMethod] = useState('kklc');
    const [learningOrder, setLearningOrder] = useState('frequency');
    useEffect(() => {
        let cancelled = false;
        VocabularyService.loadKKLCKanjiIndex().then(index => {
            if (!index || cancelled)
                return;
            const kanji = [];
            for (let i = 1; i <= Object.keys(index).length; i++) {
                kanji.push(...(index[i] ?? []));
            }
            setAllKanji(kanji);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const knownKanji = useMemo(() => allKanji.slice(0, kanjiCount), [allKanji, kanjiCount]);
    const handleSubmit = () => {
        if (kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            kanjiCount <= CONSTANTS.setup.maximumKanjiCount) {
            const values = {
                kanjiKnowledge: {
                    method: kanjiMethod,
                    step: kanjiCount,
                    kanjiSet: new Set(knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                }
            };
            onComplete(values).then();
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-8", style: { backgroundColor: THEME.colors.background }, children: _jsxs("div", { className: "max-w-3xl mx-auto p-8 space-y-12", children: [_jsx(SetupHeader, {}), _jsx(OptionGrid, { title: "Kanji learning method", value: kanjiMethod, onChange: setKanjiMethod, options: [
                        {
                            value: 'kklc',
                            label: 'KKLC',
                            description: 'Traditional school-based order',
                        },
                    ] }), _jsx(KanjiCountInput, { kanjiCount: kanjiCount, setKanjiCount: setKanjiCount }), _jsx(KanjiField, { allKanji: allKanji, knownKanjiSet: new Set(knownKanji) }), _jsx(OptionGrid, { title: "Vocabulary order", value: learningOrder, onChange: setLearningOrder, options: [
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
                    ] }), _jsx("footer", { className: "pt-4", children: _jsx("button", { onClick: handleSubmit, disabled: !knownKanji, className: "w-full rounded-lg py-4 text-lg transition-colors", style: {
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Start learning" }) })] }) }));
}
