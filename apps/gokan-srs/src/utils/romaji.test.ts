import { describe, it, expect } from 'vitest';
import { romajiToHiragana, looksLikeRomaji } from './romaji';

describe('romajiToHiragana', () => {
    it('converts basic syllables', () => {
        expect(romajiToHiragana('nichi')).toBe('にち');
        expect(romajiToHiragana('nihon')).toBe('にほん');
        expect(romajiToHiragana('watashi')).toBe('わたし');
        expect(romajiToHiragana('omou')).toBe('おもう');
    });

    it('handles syllabic n before consonants and at the end', () => {
        expect(romajiToHiragana('kanji')).toBe('かんじ');
        expect(romajiToHiragana('hon')).toBe('ほん');
        expect(romajiToHiragana('shinbun')).toBe('しんぶん');
        expect(romajiToHiragana("hon'ya")).toBe('ほんや'); // apostrophe disambiguates ん + や
    });

    it('handles double-n', () => {
        expect(romajiToHiragana('konnichi')).toBe('こんにち');
    });

    it('handles sokuon (doubled consonants)', () => {
        expect(romajiToHiragana('gakkou')).toBe('がっこう');
        expect(romajiToHiragana('kitte')).toBe('きって');
        expect(romajiToHiragana('matcha')).toBe('まっちゃ');
    });

    it('handles y-combos and alternate spellings', () => {
        expect(romajiToHiragana('kyou')).toBe('きょう');
        expect(romajiToHiragana('sha')).toBe('しゃ');
        expect(romajiToHiragana('sya')).toBe('しゃ'); // kunrei-shiki variant
        expect(romajiToHiragana('tsukau')).toBe('つかう');
        expect(romajiToHiragana('tukau')).toBe('つかう'); // kunrei variant
    });

    it('supports incremental matching for a leading full syllable', () => {
        // にち contains に, so a partial romaji query still narrows results.
        expect('にち'.includes(romajiToHiragana('ni'))).toBe(true);
    });

    it('passes through non-romaji characters untouched', () => {
        expect(romajiToHiragana('にち')).toBe('にち'); // already kana
        // English meaning words won't blow up (leftover letters pass through).
        expect(romajiToHiragana('think')).toContain('ん'); // 'n' -> ん; rest passes through harmlessly
    });
});

describe('looksLikeRomaji', () => {
    it('detects latin letters', () => {
        expect(looksLikeRomaji('nichi')).toBe(true);
        expect(looksLikeRomaji('にち')).toBe(false);
        expect(looksLikeRomaji('日')).toBe(false);
    });
});
