import {THEME} from "../commons/theme";

type KanjiReferencePanelProps = {
    allKanji: string[];
    knownKanjiSet: Set<string>;
};

export function KanjiField({
    allKanji,
    knownKanjiSet,
}: KanjiReferencePanelProps) {
    return (
        <div className="w-full max-w-5xl mt-16">
            <div
                className="mb-4 text-xs uppercase tracking-wide"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.gothic,
                    fontSize: THEME.fontSizes.labelSmall,
                }}
            >
                Known kanji (KKLC order)
            </div>

            <div
                className="relative max-h-[320px] overflow-y-auto py-2"
                style={{
                    maskImage:
                        'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
                }}
            >
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-x-4 gap-y-3">
                    {allKanji.map((kanji) => {
                        const isKnown = knownKanjiSet.has(kanji);

                        return (
                            <div
                                key={kanji}
                                className="text-center transition-all"
                                style={{
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
                                }}
                            >
                                {kanji}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div
                className="mt-3 text-xs"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                Known kanji are softly highlighted. You’ll be able to edit this list later.
            </div>
        </div>
    );
}