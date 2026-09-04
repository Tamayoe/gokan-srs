import { describe, it, expect } from 'vitest';
import { findKanjiMatch } from './kanjiSearch.utils';

const LIST = ['日', '一', '二', '三', '十', '四', '五', '六', '七', '八'];

describe('findKanjiMatch', () => {
    it('returns null for an empty or whitespace-only query', () => {
        expect(findKanjiMatch(LIST, '')).toBeNull();
        expect(findKanjiMatch(LIST, '   ')).toBeNull();
    });

    it('resolves a numeric query as a 1-based position', () => {
        expect(findKanjiMatch(LIST, '1')).toEqual({ kanji: '日', index: 0 });
        expect(findKanjiMatch(LIST, '10')).toEqual({ kanji: '八', index: 9 });
    });

    it('accepts a leading # on a position query', () => {
        expect(findKanjiMatch(LIST, '#5')).toEqual({ kanji: '十', index: 4 });
    });

    it('rejects a position outside the list', () => {
        expect(findKanjiMatch(LIST, '0')).toBeNull();
        expect(findKanjiMatch(LIST, '11')).toBeNull();
    });

    it('resolves a kanji character to its position', () => {
        expect(findKanjiMatch(LIST, '五')).toEqual({ kanji: '五', index: 6 });
    });

    it('takes the first character present in the list when handed several', () => {
        // Pasting a whole word should still land somewhere useful.
        expect(findKanjiMatch(LIST, '木三')).toEqual({ kanji: '三', index: 3 });
    });

    it('returns null for a character absent from the list', () => {
        expect(findKanjiMatch(LIST, '語')).toBeNull();
    });
});
