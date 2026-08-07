/**
 * Shared candidate-refill for both quiz activities' advanceQueue actions: given
 * the currently-buffered intro candidates, ask the activity's SRS service for
 * the next batch of ids (excluding what's already buffered), load each, and
 * report a critical error if the index listed ids but every one failed to load
 * (a missing/out-of-sync data file - the caller surfaces a fatal load error and
 * aborts rather than spinning on an empty batch forever).
 */

export interface RefillResult<T> {
    /** Newly loaded candidate items (empty if none were needed or found). */
    newCandidates: T[];
    /**
     * The first candidate id when the index listed candidates but ALL failed to
     * load; null otherwise. When set, the caller should dispatch its
     * activity-specific fatal load error and abort.
     */
    criticalErrorId: string | null;
}

interface RefillOptions<T extends { id: string }> {
    /** Candidates already buffered - excluded from the fetch and counted against batchSize. */
    existing: T[];
    /** Target buffer size (CONSTANTS.srs.newVocabBatchSize). */
    batchSize: number;
    /** Activity SRS service's "next ids in learning order" call. */
    getNextIds: (maxToFind: number, ignored: Set<string>) => Promise<string[]>;
    /** Loads one candidate by id (returns null when the file yields nothing). */
    loadItem: (id: string) => Promise<T | null>;
    /** Prefix for console diagnostics, e.g. "useQuizOrchestration". */
    logLabel: string;
}

export async function refillCandidates<T extends { id: string }>({
    existing,
    batchSize,
    getNextIds,
    loadItem,
    logLabel,
}: RefillOptions<T>): Promise<RefillResult<T>> {
    const ignored = new Set(existing.map(c => c.id));
    const maxToFind = batchSize - existing.length;

    const candidateIds = await getNextIds(maxToFind, ignored);

    const newCandidates: T[] = [];
    for (const id of candidateIds) {
        try {
            const item = await loadItem(id);
            if (item) newCandidates.push(item);
        } catch (e) {
            console.error(`[${logLabel}] Failed to load candidate ${id}`, e);
        }
    }

    if (candidateIds.length > 0 && newCandidates.length === 0) {
        console.error(`[${logLabel}] CRITICAL: Found candidates in index, but ALL failed to load.`, { candidateIds });
        return { newCandidates: [], criticalErrorId: candidateIds[0] };
    }

    return { newCandidates, criticalErrorId: null };
}
