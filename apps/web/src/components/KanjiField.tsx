import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";

type KanjiReferencePanelProps = {
    allKanji: string[];
};

export function KanjiField({
    allKanji,
}: KanjiReferencePanelProps) {
    const { state, toggleKanji } = useKanjiForm();
    return (
        <div className="w-full max-w-5xl mt-8">
            <div className="mb-4 text-xs uppercase tracking-wide text-secondary font-gothic text-[0.6875rem]">
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
                        const isKnown = state.knownKanji.has(kanji);

                        return (
                            <div
                                key={kanji}
                                className={`
                                    text-center transition-all font-mincho text-lg py-1 rounded-md cursor-pointer
                                    ${isKnown
                                        ? "text-primary bg-feedback-background"
                                        : "text-tertiary bg-transparent"
                                    }
                                `.trim().replace(/\s+/g, ' ')}
                                onClick={() => toggleKanji(kanji)}
                            >
                                {kanji}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-3 text-xs text-secondary font-serif">
                Known kanji are softly highlighted. They are editable after you started learning
            </div>
        </div>
    );
}