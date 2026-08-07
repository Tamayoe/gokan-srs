import { describe, it, expect } from 'vitest';
import { mergeQueuesById } from './mergeProgress';

type Item = { id: string; v: number };

describe('mergeQueuesById', () => {
    const keyOf = (i: Item) => i.id;
    const mergeOne = (l: Item, r: Item): Item => ({ id: l.id, v: Math.max(l.v, r.v) });

    it('is a pure union - keeps items present on only one side as-is', () => {
        const local = [{ id: 'a', v: 1 }];
        const remote = [{ id: 'b', v: 2 }];
        const merged = mergeQueuesById(local, remote, keyOf, mergeOne);
        expect(merged).toHaveLength(2);
        expect(merged.find(i => i.id === 'a')).toBe(local[0]);
        expect(merged.find(i => i.id === 'b')).toBe(remote[0]);
    });

    it('combines items present on both sides via mergeOne', () => {
        const merged = mergeQueuesById(
            [{ id: 'a', v: 1 }],
            [{ id: 'a', v: 5 }],
            keyOf,
            mergeOne
        );
        expect(merged).toEqual([{ id: 'a', v: 5 }]);
    });

    it('never drops an id', () => {
        const merged = mergeQueuesById(
            [{ id: 'a', v: 1 }, { id: 'b', v: 1 }],
            [{ id: 'b', v: 2 }, { id: 'c', v: 3 }],
            keyOf,
            mergeOne
        );
        expect(new Set(merged.map(i => i.id))).toEqual(new Set(['a', 'b', 'c']));
    });
});
