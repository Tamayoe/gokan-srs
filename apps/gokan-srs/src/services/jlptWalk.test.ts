import { describe, it, expect } from 'vitest';
import { collectJlptCandidates, countJlptCandidates } from './jlptWalk';

const LEVELS = [5, 4, 3, 2, 1] as const;
const index: Record<number, string[]> = {
    5: ['a', 'b', 'c'],
    4: ['d', 'e'],
    3: ['f'],
    2: [],
    1: ['g'],
};

const entriesForLevel = (level: number) => index[level] ?? [];

describe('collectJlptCandidates', () => {
    it('walks levels in order (N5 -> N1) and stops at max', () => {
        const out = collectJlptCandidates(LEVELS, entriesForLevel, id => id, () => true, 4);
        expect(out).toEqual(['a', 'b', 'c', 'd']);
    });

    it('skips entries the accept predicate rejects', () => {
        const active = new Set(['a', 'd']);
        const out = collectJlptCandidates(LEVELS, entriesForLevel, id => id, id => !active.has(id), 3);
        expect(out).toEqual(['b', 'c', 'e']);
    });

    it('returns [] for max <= 0', () => {
        expect(collectJlptCandidates(LEVELS, entriesForLevel, id => id, () => true, 0)).toEqual([]);
    });

    it('returns everything accepted when max exceeds the pool', () => {
        const out = collectJlptCandidates(LEVELS, entriesForLevel, id => id, () => true, 100);
        expect(out).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    });
});

describe('countJlptCandidates', () => {
    it('counts all accepted entries with no limit', () => {
        expect(countJlptCandidates(LEVELS, entriesForLevel, () => true)).toBe(7);
    });

    it('stops early once the limit is reached', () => {
        expect(countJlptCandidates(LEVELS, entriesForLevel, () => true, 2)).toBe(2);
    });

    it('honors the accept predicate', () => {
        const active = new Set(['a', 'b', 'g']);
        expect(countJlptCandidates(LEVELS, entriesForLevel, id => !active.has(id))).toBe(4);
    });
});
