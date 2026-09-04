export type KanjiMatch = { kanji: string; index: number };

/**
 * Resolves the kanji grid's search query to a single position in the ordered
 * kanji list. Two ways in, matching how a kanji actually gets looked up on the
 * profile page: by position ("1240", or "#1240") when the user knows roughly
 * where they are in the order, or by typing the character itself when they only
 * want to know whether it counts as known yet.
 *
 * Pure and order-agnostic: it only ever indexes into the list it is handed, so
 * a future RTK/JLPT ordering needs no change here.
 */
export function findKanjiMatch(allKanji: string[], rawQuery: string): KanjiMatch | null {
    const query = rawQuery.trim().replace(/^#/, '');
    if (!query) return null;

    if (/^\d+$/.test(query)) {
        // Positions are 1-based on screen (the gutter labels and the "#1240"
        // readout), so a query is one ahead of its array index.
        const index = Number(query) - 1;
        if (index < 0 || index >= allKanji.length) return null;
        return { kanji: allKanji[index], index };
    }

    // Take the first character that is actually in the list, so pasting a whole
    // word still lands on something rather than reporting nothing found.
    for (const char of Array.from(query)) {
        const index = allKanji.indexOf(char);
        if (index !== -1) return { kanji: char, index };
    }

    return null;
}
