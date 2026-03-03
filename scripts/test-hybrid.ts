import { SentenceTokenizer } from '../src/utils/tokenizer';
import kuromoji from 'kuromoji';

async function main() {
    const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) => {
        kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
            if (err) reject(err);
            else resolve(t);
        });
    });

    const sentenceTokenizer = new SentenceTokenizer(tokenizer);

    // Fake vocab set
    const vocabSet = new Set([
        'あの', '人', 'たち', 'あの人', '人たち', 'あの人たち',
        '顰蹙を買う', '顰蹙', '買う', 'を',
        '人気', '気', '大人', '大',
        '素晴らしい', 'らしい', '晴らしい', // fake
        '思い出す', '思う', '出す',
        'だから', 'から',
        'お母さん', '母さん'
    ]);

    const wordsToTest = ['あの人たち', '顰蹙を買う', '人気', '素晴らしい', '思い出す', 'だから', 'お母さん'];

    for (const targetWord of wordsToTest) {
        console.log(`\nTesting target: ${targetWord}`);

        const extracted = sentenceTokenizer.extractMatches(targetWord, vocabSet);
        const components = new Set<string>();

        // 1. Add all from Kuromoji extractMatches
        for (const word of Object.keys(extracted)) {
            if (word !== targetWord) components.add(word);
        }

        // 2. Add all from Substring match for Kanji words
        for (const candidate of vocabSet) {
            if (candidate === targetWord) continue;

            // has kanji?
            const hasKanji = /[\u4e00-\u9faf]/.test(candidate);

            if (hasKanji && targetWord.includes(candidate)) {
                components.add(candidate);
            }
        }

        console.log("Components:", Array.from(components));
    }
}

main().catch(console.error);
