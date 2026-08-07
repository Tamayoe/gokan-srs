import { describe, it, expect, vi } from 'vitest';
import { refillCandidates } from './refillCandidates';

type Item = { id: string };

describe('refillCandidates', () => {
    it('loads the ids returned by getNextIds, excluding existing candidates', async () => {
        const getNextIds = vi.fn(async (max: number, ignored: Set<string>) => {
            expect(max).toBe(2); // batchSize 3 - 1 existing
            expect(ignored.has('x')).toBe(true);
            return ['a', 'b'];
        });
        const loadItem = vi.fn(async (id: string) => ({ id }));

        const res = await refillCandidates<Item>({
            existing: [{ id: 'x' }],
            batchSize: 3,
            getNextIds,
            loadItem,
            logLabel: 'test',
        });

        expect(res.criticalErrorId).toBeNull();
        expect(res.newCandidates.map(c => c.id)).toEqual(['a', 'b']);
    });

    it('skips individual failed loads but does not error if at least one loads', async () => {
        const res = await refillCandidates<Item>({
            existing: [],
            batchSize: 3,
            getNextIds: async () => ['a', 'b', 'c'],
            loadItem: async (id) => (id === 'b' ? (() => { throw new Error('boom'); })() : { id }),
            logLabel: 'test',
        });
        expect(res.criticalErrorId).toBeNull();
        expect(res.newCandidates.map(c => c.id)).toEqual(['a', 'c']);
    });

    it('reports a critical error when ids exist but every load fails', async () => {
        const res = await refillCandidates<Item>({
            existing: [],
            batchSize: 3,
            getNextIds: async () => ['a', 'b'],
            loadItem: async () => { throw new Error('all fail'); },
            logLabel: 'test',
        });
        expect(res.criticalErrorId).toBe('a');
        expect(res.newCandidates).toEqual([]);
    });

    it('returns empty (no error) when getNextIds yields nothing', async () => {
        const res = await refillCandidates<Item>({
            existing: [],
            batchSize: 3,
            getNextIds: async () => [],
            loadItem: async (id) => ({ id }),
            logLabel: 'test',
        });
        expect(res.criticalErrorId).toBeNull();
        expect(res.newCandidates).toEqual([]);
    });
});
