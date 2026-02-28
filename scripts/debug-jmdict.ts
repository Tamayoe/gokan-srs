import * as fs from 'fs';

const rawData = fs.readFileSync('data/raw/JMdict.json', 'utf8');
const jmdict = JSON.parse(rawData);

const results = jmdict.words.filter((w: any) =>
    w.id === '1574360' ||
    w.kanji.some((k: any) => k.text.includes('顰蹙')) ||
    w.kana.some((k: any) => k.text.includes('ひんしゅく'))
);

console.log(`Found ${results.length} matches:`);
console.log(JSON.stringify(results, null, 2));
