import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
export function KanjiField({ allKanji, knownKanjiSet, }) {
    return (_jsxs("div", { className: "w-full max-w-5xl mt-16", children: [_jsx("div", { className: "mb-4 text-xs uppercase tracking-wide", style: {
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.gothic,
                    fontSize: THEME.fontSizes.labelSmall,
                }, children: "Known kanji (KKLC order)" }), _jsx("div", { className: "relative max-h-[320px] overflow-y-auto py-2", style: {
                    maskImage: 'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
                }, children: _jsx("div", { className: "grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-x-4 gap-y-3", children: allKanji.map((kanji) => {
                        const isKnown = knownKanjiSet.has(kanji);
                        return (_jsx("div", { className: "text-center transition-all", style: {
                                fontFamily: THEME.fonts.mincho,
                                fontSize: THEME.fontSizes.lg,
                                color: isKnown
                                    ? THEME.colors.primary
                                    : THEME.colors.tertiary,
                                backgroundColor: isKnown
                                    ? THEME.colors.feedbackBackground
                                    : 'transparent',
                                borderRadius: THEME.sizes.borderRadius,
                                padding: '4px 0',
                            }, children: kanji }, kanji));
                    }) }) }), _jsx("div", { className: "mt-3 text-xs", style: {
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }, children: "Known kanji are softly highlighted. You\u2019ll be able to edit this list later." })] }));
}
