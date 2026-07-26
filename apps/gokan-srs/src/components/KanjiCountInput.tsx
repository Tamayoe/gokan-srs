import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";

export function KanjiCountInput() {
    const { state, setKanjiCount } = useKanjiForm();

    return (
        <section className="mt-8 space-y-3">
            <label className="block text-sm uppercase tracking-wide font-gothic text-secondary">
                Known Kanji Count
            </label>
            <input
                type="number"
                min={1}
                value={state.kanjiCount}
                onChange={e => setKanjiCount(+e.target.value)}
                className="w-full border rounded px-4 py-3 text-lg border-divider bg-surface text-primary font-gothic"
            />
        </section>
    );
}