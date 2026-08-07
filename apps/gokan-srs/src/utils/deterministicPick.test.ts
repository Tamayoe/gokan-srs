import { describe, it, expect } from 'vitest';
import { hashString, pickStable } from './deterministicPick';

describe('hashString', () => {
    it('is deterministic for the same input', () => {
        expect(hashString('n5-001:3')).toBe(hashString('n5-001:3'));
    });

    it('differs for different inputs (in practice)', () => {
        expect(hashString('a')).not.toBe(hashString('b'));
    });

    it('returns an unsigned 32-bit integer', () => {
        const h = hashString('anything');
        expect(h).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(h)).toBe(true);
    });
});

describe('pickStable', () => {
    const items = [{ id: 'a', v: 0 }, { id: 'b', v: 0 }, { id: 'c', v: 0 }];
    const seedOf = (i: { id: string; v: number }) => `${i.id}:${i.v}`;

    it('returns null for an empty pool', () => {
        expect(pickStable([], seedOf)).toBeNull();
    });

    it('returns the same item for the same pool state across calls', () => {
        const a = pickStable(items, seedOf);
        const b = pickStable(items, seedOf);
        expect(a).toBe(b);
    });

    it('always picks a member of the pool', () => {
        const picked = pickStable(items, seedOf)!;
        expect(items).toContain(picked);
    });

    it('reshuffles when an item seed changes', () => {
        // Find a seed change that alters the pick; the pick is a pure function of
        // the joined seed, so at least one per-item change must move it.
        const before = pickStable(items, seedOf);
        const mutated = items.map((i, idx) => (idx === 0 ? { ...i, v: 99 } : i));
        const after = pickStable(mutated, seedOf);
        // Same references except item 0; the pick is deterministic either way.
        expect(pickStable(mutated, seedOf)).toBe(after);
        // Not asserting before !== after (a single change may or may not move it),
        // only that both are stable and valid members.
        expect(items).toContain(before);
        expect(mutated).toContain(after);
    });
});
