import fs from 'fs';
import path from 'path';
import type { Sense, Vocabulary } from '../src/models/vocabulary.model';
import { buildMiscFlags, parseJPDBEntry } from './build-common';
import { BUILD_LIMITS } from './build-constants';
import type { Kanji } from '../src/models/kanji.model';
import { JMDict } from "../src/models/data.model";

const jmdict: JMDict = JSON.parse(fs.readFileSync('./data/raw/jmdict.json', 'utf-8'));
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

const allVocabulary: Vocabulary[] = [];

for (const entry of jmdict.words) {
    if (!entry.kanji.length || !entry.kana.length) continue;

    const primaryKanji = entry.kanji.find(k => k.common);
    if (!primaryKanji) continue;

    const kanjiText = primaryKanji.text;
    const containedKanji = extractKanji(kanjiText);
    if (!containedKanji.length) continue;

    const jpdbEntry = jpdb[kanjiText]
        ? parseJPDBEntry(jpdb[kanjiText])
        : null;

    if (!jpdbEntry?.kanjiRank) continue;

    const kklcStep = Math.max(
        ...containedKanji.map(k => kklcMap.get(k) ?? 0),
    );
    if (!kklcStep) continue;

    const primaryReading =
        entry.kana.find(k => k.common && k.appliesToKanji.includes("*"))?.text
        ?? entry.kana[0].text;

    const alternativeReadings = entry.kana
        .map(k => k.text)
        .filter(r => r !== primaryReading);

    const senses: Sense[] = entry.sense.map(s => ({
        pos: s.partOfSpeech,
        misc: buildMiscFlags(s.misc),
        glosses: s.gloss.map(g => g.text),
        related: {
            compounds: s.related.map(r => r[0]),
        },
    }));

    const requiresContext =
        entry.kana.length > 1 || senses.some(s => s.misc.isSuffix);

    allVocabulary.push({
        id: entry.id,

        writtenForm: {
            kanji: kanjiText,
            containedKanji,
        },

        reading: {
            primary: primaryReading,
            alternatives: alternativeReadings,
        },

        frequency: {
            kanjiRank: jpdbEntry.kanjiRank,
            kanaRank: jpdbEntry.hiraganaRank,
        },

        progression: {
            kklcStep,
        },

        senses,

        usageHints: {
            requiresContext,
        },
    });
}

// Sort by frequency and limit
const selected = allVocabulary
    .sort((a, b) => a.frequency.kanjiRank - b.frequency.kanjiRank)
    .slice(0, BUILD_LIMITS.MAX_VOCABULARY);

// Ensure output dirs
fs.mkdirSync('./data/compiled/vocab', { recursive: true });
fs.mkdirSync('./data/compiled/index', { recursive: true });

// Build KKLC index (step-by-step mode)
const kklcIndex: Record<number, string[]> = {};

// Build frequency index (frequency mode)
interface FrequencyIndexEntry {
    id: string;
    containedKanji: string[];
}
const frequencyIndex: FrequencyIndexEntry[] = [];

for (const vocab of selected) {
    const { kklcStep, ...clean } = vocab;

    // Write individual vocab file
    fs.writeFileSync(
        path.join('./data/compiled/vocab', `${vocab.id}.json`),
        JSON.stringify(clean, null, 2),
    );

    // Add to KKLC step index
    if (!kklcIndex[kklcStep]) {
        kklcIndex[kklcStep] = [];
    }
    kklcIndex[kklcStep].push(vocab.id);

    // Add to frequency index (already sorted by frequency)
    frequencyIndex.push({
        id: vocab.id,
        containedKanji: vocab.writtenForm.containedKanji,
    });
}

// Write KKLC step index
fs.writeFileSync(
    './data/compiled/index/kklc.json',
    JSON.stringify(kklcIndex, null, 2),
);

// Write frequency index
fs.writeFileSync(
    './data/compiled/index/frequency.json',
    JSON.stringify(frequencyIndex, null, 2),
);

console.log(
    `✅ Built ${selected.length} vocab entries`,
);
console.log(
    `   - KKLC index: ${Object.keys(kklcIndex).length} steps`,
);
console.log(
    `   - Frequency index: ${frequencyIndex.length} words (sorted by frequency)`,
);