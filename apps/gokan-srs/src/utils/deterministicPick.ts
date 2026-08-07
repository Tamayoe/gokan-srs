/**
 * Deterministic pick shared by both quiz activities' "what card next" selectors
 * (vocab's selectNextView, grammar's selectNextGrammarView).
 *
 * Randomizing which due item comes next is intentional (it prevents interference
 * effects), but the picker runs inside a selector that is recomputed on every
 * state change: a Math.random() pick returned a DIFFERENT item per recomputation,
 * and since loading that item changes state, each pick triggered the next - a
 * visible cascade of flashing cards until two consecutive rolls happened to
 * agree. Seeding the choice on the pool's own state makes the same pool always
 * yield the same pick, while any real change to the pool (a review, a retry flag
 * flip) still naturally reshuffles the order.
 */

export function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

/**
 * Picks one item from `items`, seeded by joining each item's `seedOf(item)` -
 * so the choice is stable for a given pool state but reshuffles whenever any
 * item's seed changes. Returns null for an empty pool.
 */
export function pickStable<T>(items: T[], seedOf: (item: T) => string): T | null {
    if (items.length === 0) return null;
    const seed = items.map(seedOf).join('|');
    return items[hashString(seed) % items.length];
}
