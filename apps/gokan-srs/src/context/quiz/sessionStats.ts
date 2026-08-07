/**
 * Shared session-progress bookkeeping for both quiz activities
 * (selectSessionStats / selectGrammarSessionStats) and the next-session preview
 * cards on the Main hub (selectNextSessionPreview / selectNextGrammarSessionPreview).
 * Both work over opaque string keys (vocab's `vocabId:quizType` task keys,
 * grammar's grammar ids), so the algorithms live here once and each activity
 * supplies its own key extraction / predicates.
 */

export interface SessionStatsCore {
    /** Committed tasks no longer actionable (answered, deferred, or graduated). */
    done: number;
    /** Size of the committed set - the stable progress denominator. */
    total: number;
    /** Committed tasks currently awaiting a retry (wrong this session). */
    retriesPending: number;
    /** Count of actionable-now work that is NOT part of this session. */
    waiting: number;
}

interface ComputeSessionStatsOptions {
    /** The session's frozen committed key set. */
    committed: string[];
    /** Keys actionable right now. */
    actionable: string[];
    /** Whether a still-actionable committed key is a pending retry. */
    isRetry: (key: string) => boolean;
    /**
     * Collapses the non-committed actionable keys to a "waiting" count. Vocab
     * counts distinct vocabIds (reading+meaning of one word count once); grammar
     * is identity (one key per point).
     */
    waitingCountOf: (nonCommittedActionableKeys: string[]) => number;
}

export function computeSessionStats(opts: ComputeSessionStatsOptions): SessionStatsCore {
    const committedSet = new Set(opts.committed);
    const actionableSet = new Set(opts.actionable);
    const total = committedSet.size;

    // A committed task is "done" once it is no longer actionable. Still-actionable
    // committed tasks are either not yet answered or awaiting a retry.
    let done = 0;
    let retriesPending = 0;
    for (const key of committedSet) {
        if (!actionableSet.has(key)) {
            done++;
            continue;
        }
        if (opts.isRetry(key)) retriesPending++;
    }

    // Work that came due AFTER the session started (not committed) doesn't inflate
    // the total - reported separately as "waiting for a future session".
    const waitingKeys: string[] = [];
    for (const key of actionableSet) {
        if (!committedSet.has(key)) waitingKeys.push(key);
    }

    return { done, total, retriesPending, waiting: opts.waitingCountOf(waitingKeys) };
}

export interface SessionPreviewCore {
    review: number;
    new: number;
    retries: number;
}

/**
 * Preview of what the next session will contain, bucketed per item with the
 * buckets mutually exclusive (first match wins): retries > new > review. Shared
 * by both activities' Main-hub preview cards.
 */
export function computeSessionPreview<Item>(
    items: Item[],
    opts: {
        isGraduated: (item: Item) => boolean;
        isRetry: (item: Item) => boolean;
        isNew: (item: Item) => boolean;
        isDue: (item: Item) => boolean;
    }
): SessionPreviewCore {
    const preview: SessionPreviewCore = { review: 0, new: 0, retries: 0 };

    for (const item of items) {
        if (opts.isGraduated(item)) continue;

        if (opts.isRetry(item)) preview.retries++;
        else if (opts.isNew(item)) preview.new++;
        else if (opts.isDue(item)) preview.review++;
    }

    return preview;
}
