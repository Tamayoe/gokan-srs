/**
 * Shared "what session state are we in" ladder for both quiz activities'
 * next-view selectors (selectNextView / selectNextGrammarView). The state
 * machine is identical - due reviews mean 'review', otherwise the earliest
 * upcoming review time plus a learn/waiting/exhausted decision - so only the
 * per-item predicates and the (activity-specific) state string values differ.
 */

export interface SessionStateResult<S extends string> {
    sessionState: S;
    nextReviewAt: Date | null;
}

interface ComputeSessionStateOptions<Item, S extends string> {
    isLearning: (item: Item) => boolean;
    isDue: (item: Item) => boolean;
    nextReviewAtOf: (item: Item) => Date | null;
    /** True when brand-new items can still be introduced (or intro candidates are buffered). */
    canLearn: boolean;
    states: { review: S; learn: S; waiting: S; exhausted: S };
    /**
     * State slotted between 'learn' and 'waiting' when nothing is learnable
     * (vocab's 'learn-kanji' KKLC step-unlock). Null/omitted for activities
     * without one (grammar).
     */
    extraState?: S | null;
}

/**
 * Returns { sessionState, nextReviewAt }. `items` is the activity's queue, or
 * undefined when there is no loaded progress yet (yields exhausted / null).
 */
export function computeSessionState<Item, S extends string>(
    items: Item[] | undefined,
    opts: ComputeSessionStateOptions<Item, S>
): SessionStateResult<S> {
    if (!items) return { sessionState: opts.states.exhausted, nextReviewAt: null };

    const learning = items.filter(opts.isLearning);
    const due = learning.filter(opts.isDue);

    if (due.length > 0) {
        return { sessionState: opts.states.review, nextReviewAt: null };
    }

    const nextReviewAt = learning
        .map(opts.nextReviewAtOf)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const sessionState: S = opts.canLearn
        ? opts.states.learn
        : opts.extraState
            ? opts.extraState
            : learning.length > 0
                ? opts.states.waiting
                : opts.states.exhausted;

    return { sessionState, nextReviewAt };
}
