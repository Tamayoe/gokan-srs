import fs from 'fs';
import path from 'path';
import type { Vocabulary } from '../src/models/vocabulary.model';
import { parseJPDBEntry } from './common';
import { BUILD_LIMITS } from './constants';
import type { Kanji } from '../src/models/kanji.model';

const jmdict = JSON.parse(fs.readFileSync('./data/raw/jmdict.json', 'utf-8'));
const jpdb = JSON.parse(fs.readFileSync('./data/raw/jpdb_v2.json', 'utf-8'));
const kanjiData: Kanji[] = JSON.parse(
    fs.readFileSync('./data/compiled/kanji.json', 'utf-8'),
);

// Build kanji → KKLC step lookup
const kklcMap = new Map<string, number>();
for (const k of kanjiData) {
    if (k.steps?.kklc) {
        kklcMap.set(k.character, k.steps.kklc);
    }
}

function extractKanji(word: string): string[] {
    return [...word].filter(c => /[\u4e00-\u9faf]/.test(c));
}

const allVocabulary: (Vocabulary & { kklcStep: number })[] = [];

for (const entry of jmdict.words) {
    if (!entry.kanji.length || !entry.kana.length) continue;

    const kanjiForm = entry.kanji[0].text;
    const reading = entry.kana[0].text;
    const containedKanji = extractKanji(kanjiForm);

    if (!containedKanji.length) continue;

    const jpdbEntry = jpdb[kanjiForm]
        ? parseJPDBEntry(jpdb[kanjiForm])
        : null;

    if (!jpdbEntry?.kanjiRank) continue;

    const kklcStep = Math.max(
        ...containedKanji.map(k => kklcMap.get(k) ?? 0),
    );

    if (!kklcStep) continue;

    allVocabulary.push({
        id: entry.id,
        kanji: kanjiForm,
        reading,
        meanings: entry.sense.flatMap((s: any) =>
            s.gloss.map((g: any) => g.text),
        ),
        frequency: jpdbEntry.kanjiRank,
        hiraganaFrequency: jpdbEntry.hiraganaRank,
        containedKanji,
        pos: entry.sense.flatMap((s: any) => s.partOfSpeech),
        kklcStep,
    });
}

// Sort by frequency and limit
const selected = allVocabulary
    .sort((a, b) => a.frequency - b.frequency)
    .slice(0, BUILD_LIMITS.MAX_VOCABULARY);

// Ensure output dirs
fs.mkdirSync('./data/compiled/vocab', { recursive: true });
fs.mkdirSync('./data/compiled/index', { recursive: true });

// Build KKLC index
const kklcIndex: Record<number, string[]> = {};

for (const vocab of selected) {
    const { kklcStep, ...clean } = vocab;

    // Write individual vocab file
    fs.writeFileSync(
        path.join('./data/compiled/vocab', `${vocab.id}.json`),
        JSON.stringify(clean, null, 2),
    );

    if (!kklcIndex[kklcStep]) {
        kklcIndex[kklcStep] = [];
    }

    kklcIndex[kklcStep].push(vocab.id);
}

// Sort index entries by frequency order (already sorted globally)
for (const step in kklcIndex) {
    kklcIndex[step] = kklcIndex[step];
}

fs.writeFileSync(
    './data/compiled/index/kklc.json',
    JSON.stringify(kklcIndex, null, 2),
);

console.log(
    `✅ Built ${selected.length} vocab entries (KKLC-indexed)`,
);