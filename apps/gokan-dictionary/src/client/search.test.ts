import { describe, it, expect } from 'vitest';
import { matches, filterEntries } from './search';
import type { SearchIndex, SearchIndexEntry } from '../models/index.model';

const OMOU: SearchIndexEntry = { id: '1589350', w: '思う', r: 'おもう', m: 'to think, to consider' };
const IU: SearchIndexEntry = { id: '1587040', w: '言う', r: 'いう', m: 'to say, to utter' };
const INDEX: SearchIndex = [OMOU, IU];

describe('matches', () => {
    it('matches on the kanji written form', () => {
        expect(matches(OMOU, '思')).toBe(true);
    });

    it('matches on the reading', () => {
        expect(matches(OMOU, 'おも')).toBe(true);
    });

    it('matches on the meaning, case-insensitively', () => {
        expect(matches(OMOU, 'THINK')).toBe(true);
    });

    it('does not match unrelated queries', () => {
        expect(matches(OMOU, 'banana')).toBe(false);
    });
});

describe('filterEntries', () => {
    it('returns entries matching the query', () => {
        expect(filterEntries(INDEX, 'say', 20)).toEqual([IU]);
    });

    it('returns an empty array for a blank query', () => {
        expect(filterEntries(INDEX, '   ', 20)).toEqual([]);
    });

    it('caps results at maxResults', () => {
        expect(filterEntries(INDEX, 'to', 1)).toEqual([OMOU]);
    });

    it('returns an empty array when nothing matches', () => {
        expect(filterEntries(INDEX, 'xyz', 20)).toEqual([]);
    });
});
