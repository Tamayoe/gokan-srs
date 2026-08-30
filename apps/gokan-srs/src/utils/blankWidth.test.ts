import { describe, it, expect } from 'vitest';
import { blankWidthEm } from './blankWidth';

describe('blankWidthEm', () => {
    it('gives a full em to every full-width character', () => {
        // The reported bug: もどる got 4ch - about two kana wide - and overflowed.
        // Three kana plus caret slack is 4em, which in a 2xl font is comfortably
        // wider than the 4ch it used to get.
        expect(blankWidthEm('もどる')).toBe(4);
        expect(blankWidthEm('に戻ります')).toBe(6);
    });

    it('counts kanji, kana, and full-width punctuation alike', () => {
        for (const text of ['あ', 'ア', '漢', '、', '？']) {
            expect(blankWidthEm(text), text).toBe(blankWidthEm('あ'));
        }
    });

    it('gives half-width characters roughly half as much', () => {
        expect(blankWidthEm('abcdefgh')).toBeLessThan(blankWidthEm('あいうえおかきく'));
    });

    it('never goes below the minimum, so an empty blank is still visible', () => {
        expect(blankWidthEm('')).toBeGreaterThanOrEqual(3.5);
        expect(blankWidthEm('も')).toBe(blankWidthEm(''));
    });

    it('grows monotonically as the learner types', () => {
        const widths = ['', 'も', 'もど', 'もどる', 'もどります'].map(blankWidthEm);
        for (let i = 1; i < widths.length; i++) {
            expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1]);
        }
    });

    it('does not leak the answer length: an empty blank is always the same width', () => {
        // Sizing a blank to its expected answer would tell the learner how many
        // characters to produce - a hint they cannot decline. Every empty blank is
        // identical regardless of what belongs in it.
        expect(blankWidthEm('')).toBe(3.5);
    });
});
