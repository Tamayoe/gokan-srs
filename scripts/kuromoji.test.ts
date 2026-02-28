import { describe, it, expect, beforeAll } from 'vitest';
import kuromoji from 'kuromoji';
import { SentenceTokenizer } from '../src/utils/tokenizer';

describe('Kuromoji Sentence Parsing & Compound Logic', () => {
    let tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

    beforeAll(async () => {
        tokenizer = await new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
                if (err) reject(err);
                else resolve(t);
            });
        });
    });

    // We simulate the logic in build-sentences.ts
    function testMatch(sentence: string, targetVocab: string): boolean {
        const parser = new SentenceTokenizer(tokenizer);
        const matches = parser.extractMatches(sentence, [targetVocab]);
        return !!matches[targetVocab];
    }

    it('should distinguish between 通り (street) and 通る (to pass) appropriately', () => {
        // Here we expect "通り" to match "通り" but NOT "通る"
        expect(testMatch('この通りを歩く', '通り')).toBe(true);
        expect(testMatch('この通りを歩く', '通る')).toBe(false);

        // Here we expect "通る" to match "通る" but NOT "通り"
        expect(testMatch('車が通る', '通る')).toBe(true);
        expect(testMatch('車が通る', '通り')).toBe(false);
    });

    it('should properly match the compound 顰蹙を買う when conjugated to かい', () => {
        expect(testMatch('文句を言って顰蹙をかいまくる。', '顰蹙を買う')).toBe(true);
    });
});
