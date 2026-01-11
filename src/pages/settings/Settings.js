import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../../commons/theme";
import { OptionGrid } from "../../components/OptionGrid";
export function SettingsScreen({ settings, onUpdateSettings, onReset, onBack, }) {
    return (_jsxs("div", { className: "min-h-screen flex flex-col items-center p-8", style: { backgroundColor: THEME.colors.background }, children: [_jsxs("div", { className: "w-full max-w-2xl flex items-center mb-12", children: [_jsx("button", { onClick: onBack, className: "text-sm", style: {
                            color: THEME.colors.secondary,
                            fontFamily: THEME.fonts.gothic,
                        }, children: "\u2190 Back" }), _jsx("h1", { className: "flex-1 text-center text-xl", style: {
                            color: THEME.colors.primary,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Settings" })] }), _jsxs("section", { className: "w-full max-w-2xl mb-16", children: [_jsx("h2", { className: "mb-4 uppercase tracking-wide text-xs", style: {
                            color: THEME.colors.secondary,
                            fontFamily: THEME.fonts.gothic,
                        }, children: "Learning preferences" }), _jsx(OptionGrid, { title: "Vocabulary order", value: settings.preferredLearningOrder, onChange: (value) => onUpdateSettings({
                            ...settings,
                            preferredLearningOrder: value,
                        }), options: [
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
                        ] })] }), _jsxs("section", { className: "w-full max-w-2xl", children: [_jsx("h2", { className: "mb-4 uppercase tracking-wide text-xs", style: {
                            color: THEME.colors.errorAccent,
                            fontFamily: THEME.fonts.gothic,
                        }, children: "Danger zone" }), _jsx("button", { onClick: onReset, className: "w-full border rounded px-4 py-3 text-sm", style: {
                            borderColor: THEME.colors.errorAccent,
                            color: THEME.colors.errorAccent,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Reset all progress" })] })] }));
}
