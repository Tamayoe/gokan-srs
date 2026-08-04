import { describe, it, expect } from 'vitest';
import { vocabPath, kanjiPath, absoluteUrl } from './urls';

describe('vocabPath', () => {
    it('builds a trailing-slash path from a vocab id', () => {
        expect(vocabPath('1589350')).toBe('/vocab/1589350/');
    });
});

describe('kanjiPath', () => {
    it('builds a trailing-slash path from a kanji character', () => {
        expect(kanjiPath('日')).toBe('/kanji/%E6%97%A5/');
    });

    it('encodes characters that are not URL-safe on their own', () => {
        // sanity check that round-tripping through decodeURIComponent recovers the glyph
        const path = kanjiPath('文');
        const encoded = path.slice('/kanji/'.length, -1);
        expect(decodeURIComponent(encoded)).toBe('文');
    });
});

describe('absoluteUrl', () => {
    it('resolves a path against the site origin', () => {
        expect(absoluteUrl('/vocab/1589350/')).toBe('https://dictionary.gokan.dev/vocab/1589350/');
    });

    it('resolves the root path to the bare origin with trailing slash', () => {
        expect(absoluteUrl('/')).toBe('https://dictionary.gokan.dev/');
    });
});
