import kuromoji from 'kuromoji';
import { SentenceTokenizer } from '../src/utils/tokenizer';

async function run() {
    const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) => {
        kuromoji.default.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
            if (err) reject(err);
            else resolve(t);
        });
    });

    const parser = new SentenceTokenizer(tokenizer);
    const text = '文句を言って顰蹙をかいまくる。';
    const vocab = ['顰蹙を買う'];

    console.log("Input:", text);
    console.log("Searching for:", vocab);

    const vocabSet = new Set(vocab);
    console.log("Is 顰蹙を買う in set?", vocabSet.has("顰蹙を買う"));

    const matches = parser.extractMatches(text, vocab);
    console.log("Matches:", matches);
}

run();
