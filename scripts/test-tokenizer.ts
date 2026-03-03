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
        '顰蹙を買う', '顰蹙', '買う',
        '人気', '気'
    ]);

    const wordsToTest = ['あの人たち', '顰蹙を買う', '人気'];

    for (const word of wordsToTest) {
        console.log(`\nTesting word: ${word}`);
        const matches = sentenceTokenizer.extractMatches(word, vocabSet);
        console.log(matches);
    }
}

main().catch(console.error);
