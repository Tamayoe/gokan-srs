/**
 * Shared JLPT-order walk for candidate finding, used by both the vocab
 * (SRSService.findCandidatesJLPT / countLearnableVocabulary) and grammar
 * (GrammarSRSService) learning orders. Both walk their JLPT index level-by-level
 * (N5 -> N1), in source order within a level; they differ only in the index
 * entry shape and the per-entry accept predicate (grammar has no kanji filter,
 * vocab does), which are passed in.
 */

/** Walks `levels` in order, collecting the id of each accepted entry until `max` ids are found. */
export function collectJlptCandidates<E>(
    levels: readonly number[],
    entriesForLevel: (level: number) => readonly E[],
    idOf: (entry: E) => string,
    accept: (entry: E) => boolean,
    max: number
): string[] {
    const out: string[] = [];
    if (max <= 0) return out;

    for (const level of levels) {
        for (const entry of entriesForLevel(level)) {
            if (out.length >= max) return out;
            if (accept(entry)) out.push(idOf(entry));
        }
    }
    return out;
}

/** Counts accepted entries across `levels`, stopping early once `limit` is reached. */
export function countJlptCandidates<E>(
    levels: readonly number[],
    entriesForLevel: (level: number) => readonly E[],
    accept: (entry: E) => boolean,
    limit = Infinity
): number {
    let count = 0;
    for (const level of levels) {
        for (const entry of entriesForLevel(level)) {
            if (!accept(entry)) continue;
            count++;
            if (count >= limit) return count;
        }
    }
    return count;
}
