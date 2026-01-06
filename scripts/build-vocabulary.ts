import fs from 'fs';
import type { Vocabulary } from '../src/models/vocabulary.model';
import {parseJPDBEntry} from "./common";

const jmdict = JSON.parse(fs.readFileSync('./data/raw/jmdict.json', 'utf-8'));
const jpdb = JSON.parse(fs.readFileSync('./data/raw/jpdb_v2.json', 'utf-8'));

function extractKanji(word: string): string[] {
    return [...word].filter(c => c.match(/[\u4e00-\u9faf]/));
}

const vocabulary: Vocabulary[] = [];

for (const entry of jmdict.words) {
    if (!entry.kanji.length || !entry.kana.length) continue;

    const kanjiForm = entry.kanji[0].text;
    const reading = entry.kana[0].text;

    const meanings = entry.sense.flatMap((s: any) =>
        s.gloss.map((g: any) => g.text),
    );

    const jpdbEntry = jpdb[kanjiForm] ? parseJPDBEntry(jpdb[kanjiForm]) : null

    const freq = jpdbEntry?.kanjiRank ?? undefined;
    const hiraganaFreq =  jpdbEntry?.hiraganaRank ?? undefined;

    vocabulary.push({
        id: entry.id,
        kanji: kanjiForm,
        reading,
        meanings,
        frequency: freq,
        hiraganaFrequency: hiraganaFreq,
        containedKanji: extractKanji(kanjiForm),
        pos: entry.sense.flatMap((s: any) => s.partOfSpeech),
    });
}

fs.writeFileSync(
    './data/compiled/vocabulary.json',
    JSON.stringify(vocabulary, null, 2),
);