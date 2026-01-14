import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
export function KanjiCountInput() {
    const { state, setKanjiCount } = useKanjiForm();
    return (_jsxs("section", { className: "mt-8 space-y-3", children: [_jsx("label", { className: "block text-sm uppercase tracking-wide", style: { fontFamily: THEME.fonts.gothic, color: THEME.colors.secondary }, children: "Known Kanji Count" }), _jsx("input", { type: "number", min: 1, value: state.kanjiCount, onChange: e => setKanjiCount(+e.target.value), className: "w-full border rounded px-4 py-3 text-lg", style: {
                    borderColor: THEME.colors.divider,
                    backgroundColor: THEME.colors.surface,
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.gothic,
                } })] }));
}
