import { jsx as _jsx } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { KanjiFormContext } from "./KanjiFormContext";
import { VocabularyService } from "../../services/vocabulary.service";
import { CONSTANTS } from "../../commons/constants";
export function KanjiFormProvider({ initialState, children, }) {
    const [allKanji, setAllKanji] = useState([]);
    const [kanjiCount, setKanjiCount] = useState(initialState.kanjiCount ?? Number(CONSTANTS.setup.defaultKanjiCount));
    const [knownKanji, setKnownKanji] = useState(initialState.knownKanji ?? new Set());
    const [kanjiMethod] = useState(initialState.kanjiMethod ?? CONSTANTS.setup.defaultKanjiLearningMethod);
    const [loading, setLoading] = useState(true);
    const getAllKanji = () => {
        setLoading(true);
        VocabularyService.loadKKLCKanjiIndex().then(index => {
            if (!index) {
                throw Error('No index to load all kanji!');
            }
            setAllKanji(Object.keys(index).flatMap((_, i) => index[i] ?? []));
        }).finally(() => setLoading(false));
    };
    useEffect(() => {
        getAllKanji();
    }, []);
    useEffect(() => {
        if (!allKanji.length)
            return;
        setKnownKanji(prev => {
            const next = new Set(prev);
            const target = new Set(allKanji.slice(0, kanjiCount));
            // Remove kanji that exceed the count
            for (const k of next) {
                if (!target.has(k)) {
                    next.delete(k);
                }
            }
            // Add missing kanji up to count
            for (const k of target) {
                if (!next.has(k)) {
                    next.add(k);
                }
            }
            return next;
        });
    }, [kanjiCount, allKanji]);
    const toggleKanji = useCallback((k) => {
        setKnownKanji(prev => {
            const next = new Set(prev);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
        });
    }, []);
    const value = useMemo(() => ({
        state: { allKanji, kanjiCount, knownKanji, kanjiMethod, loading },
        setKanjiCount,
        toggleKanji,
    }), [allKanji, kanjiCount, knownKanji, kanjiMethod, loading]);
    return (_jsx(KanjiFormContext.Provider, { value: value, children: children }));
}
