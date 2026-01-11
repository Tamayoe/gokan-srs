import {THEME} from "../commons/theme";

export function KanjiCountInput({
                        kanjiCount,
                        setKanjiCount,
                    }: {
    kanjiCount: number;
    setKanjiCount: (value: number) => void;
}) {
    return (
        <section className="space-y-3">
            <label
                className="block text-sm uppercase tracking-wide"
                style={{ fontFamily: THEME.fonts.gothic, color: THEME.colors.secondary }}
            >
                Known Kanji Count
            </label>
            <input
                type="number"
                min={1}
                value={kanjiCount}
                onChange={(e) => setKanjiCount(Number(e.target.value))}
                className="w-full border rounded px-4 py-3 text-lg"
                style={{
                    borderColor: THEME.colors.divider,
                    backgroundColor: THEME.colors.surface,
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.gothic,
                }}
            />
        </section>
    );
}