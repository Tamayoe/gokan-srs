import { describe, it, expect } from 'vitest';
import { computeSessionStats, computeSessionPreview } from './sessionStats';

describe('computeSessionStats', () => {
    it('total is the committed set size and is unaffected by mid-session arrivals', () => {
        const stats = computeSessionStats({
            committed: ['a', 'b', 'c'],
            actionable: ['a', 'z'], // z came due mid-session, not committed
            isRetry: () => false,
            waitingCountOf: keys => keys.length,
        });
        expect(stats.total).toBe(3);
        // b, c no longer actionable -> done; a still actionable -> not done.
        expect(stats.done).toBe(2);
        expect(stats.waiting).toBe(1); // z
    });

    it('counts a still-actionable committed task as a pending retry', () => {
        const stats = computeSessionStats({
            committed: ['a', 'b'],
            actionable: ['a', 'b'],
            isRetry: key => key === 'a',
            waitingCountOf: keys => keys.length,
        });
        expect(stats.done).toBe(0);
        expect(stats.retriesPending).toBe(1);
    });

    it('uses waitingCountOf to collapse waiting keys (distinct vocab)', () => {
        const stats = computeSessionStats({
            committed: [],
            actionable: ['v1:reading', 'v1:meaning', 'v2:reading'],
            isRetry: () => false,
            waitingCountOf: keys => new Set(keys.map(k => k.split(':')[0])).size,
        });
        expect(stats.waiting).toBe(2); // v1, v2
    });
});

describe('computeSessionPreview', () => {
    type Item = { grad: boolean; retry: boolean; fresh: boolean; due: boolean };
    const opts = {
        isGraduated: (i: Item) => i.grad,
        isRetry: (i: Item) => i.retry,
        isNew: (i: Item) => i.fresh,
        isDue: (i: Item) => i.due,
    };

    it('buckets mutually exclusively with retries > new > review', () => {
        const preview = computeSessionPreview<Item>(
            [
                { grad: false, retry: true, fresh: true, due: true }, // retry wins
                { grad: false, retry: false, fresh: true, due: true }, // new wins over review
                { grad: false, retry: false, fresh: false, due: true }, // review
                { grad: true, retry: true, fresh: true, due: true }, // graduated skipped
            ],
            opts
        );
        expect(preview).toEqual({ review: 1, new: 1, retries: 1 });
    });
});
