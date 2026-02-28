import fs from 'fs';
import path from 'path';
import type { Sense, Vocabulary } from '../src/models/vocabulary.model';
import { buildMiscFlags, parseJPDBEntry } from './build-common';
import { BUILD_LIMITS } from './build-constants';
import type { Kanji } from '../src/models/kanji.model';
import { JMDict } from "../src/models/data.model";

// Type definitions for new JPDB format
interface JPDBEntry {
    frequency: number;
    kanaFrequency: number | null;
}

type JPDBData = Record<string, Record<string, JPDBEntry>>;

const jmdict: JMDict = JSON.parse(fs.readFileSync('./data/raw/jmdict.json', 'utf-8'));
const jpdb: JPDBData = JSON.parse(
    fs.readFileSync('./data/raw/jpdb_v2.2_freq_list_2024-10-13.json', 'utf-8')
);
const kanjiData: Kanji[] = JSON.parse(
    fs.readFileSync('./public/data/compiled/kanji.json', 'utf-8'),
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

// Extended interface for build process
interface BuildVocabulary extends Vocabulary {
    kklcStep: number;
}

const allVocabulary: BuildVocabulary[] = [];

for (const entry of jmdict.words) {
    if (!entry.kanji.length || !entry.kana.length) continue;

    // Relaxed check: Use common kanji if available, otherwise use first
    const primaryKanji = entry.kanji.find(k => k.common) ?? entry.kanji[0];
    if (!primaryKanji) continue;

    const kanjiText = primaryKanji.text;
    const containedKanji = extractKanji(kanjiText);
    if (!containedKanji.length) continue;

    // Calculate primary reading
    // Try to find common reading that applies to all (*), otherwise first
    const primaryReading =
        entry.kana.find(k => k.common && k.appliesToKanji.includes("*"))?.text
        ?? entry.kana[0].text;

    // Match by kanji + primary reading for accurate frequency
    const jpdbKanjiEntry = jpdb[kanjiText];
    let jpdbEntry: { kanjiRank?: number; hiraganaRank?: number } | null = null;

    if (jpdbKanjiEntry) {
        // Try to find exact match with primary reading
        const readingEntry = jpdbKanjiEntry[primaryReading];
        if (readingEntry) {
            jpdbEntry = {
                kanjiRank: readingEntry.frequency,
                hiraganaRank: readingEntry.kanaFrequency ?? undefined,
            };
        } else {
            // Fallback: use first available reading if exact match not found
            const firstReading = Object.values(jpdbKanjiEntry)[0];
            if (firstReading) {
                jpdbEntry = {
                    kanjiRank: firstReading.frequency,
                    hiraganaRank: firstReading.kanaFrequency ?? undefined,
                };
            }
        }
    }
    // If JPDB doesn't have an entry, we still keep the word!
    // We just give it a bottom-tier frequency so it can still be learned or searched via KKLC
    if (!jpdbEntry?.kanjiRank) {
        jpdbEntry = {
            kanjiRank: 999999,
            hiraganaRank: 999999
        };
    }

    let hasNonKKLC = false;
    let kklcStep = 0;
    for (const k of containedKanji) {
        const step = kklcMap.get(k);
        if (!step) {
            hasNonKKLC = true;
        } else {
            kklcStep = Math.max(kklcStep, step);
        }
    }

    if (hasNonKKLC) {
        kklcStep = 99999;
    }

    if (!kklcStep) continue; // Only skips if there were truly no kanji evaluated

    const alternativeReadings = entry.kana
        .map(k => k.text)
        .filter(r => r !== primaryReading);

    const senses: Sense[] = entry.sense.map(s => ({
        pos: s.partOfSpeech,
        misc: buildMiscFlags(s.misc as unknown as string[]),
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
            kanjiRank: jpdbEntry.kanjiRank!,
            kanaRank: jpdbEntry.hiraganaRank,
        },

        progression: {
            kklcStep,
        },

        senses,

        usageHints: {
            requiresContext,
        },
        kklcStep,
    });
}

// Group by written kanji form to merge homographs
const vocabGroups = new Map<string, BuildVocabulary[]>();
for (const vocab of allVocabulary) {
    const kanji = vocab.writtenForm.kanji;
    if (!vocabGroups.has(kanji)) {
        vocabGroups.set(kanji, []);
    }
    vocabGroups.get(kanji)!.push(vocab);
}

const mergedVocabulary: BuildVocabulary[] = [];
const mergedLogs: string[] = [];

for (const [kanji, group] of vocabGroups.entries()) {
    if (group.length === 1) {
        mergedVocabulary.push(group[0]);
        continue;
    }

    // Sort by frequency (kanjiRank). Lower rank is better (more frequent)
    group.sort((a, b) => a.frequency.kanjiRank - b.frequency.kanjiRank);

    const base = group[0];

    // Initialize merge tracking on base
    base.mergedVocabs = [{
        id: base.id,
        isBase: true,
        originalPrimaryReading: base.reading.primary,
        originalGlosses: base.senses[0]?.glosses.slice(0, 3) || []
    }];

    // Keep track of all readings to avoid exact duplicates
    const allReadings = new Set<string>();
    allReadings.add(base.reading.primary);
    base.reading.alternatives.forEach(r => allReadings.add(r));

    const logEntry = [`Merged "${kanji}": Base=${base.id} (${base.reading.primary})`];

    // Merge others into base
    for (let i = 1; i < group.length; i++) {
        const other = group[i];

        logEntry.push(`  <- ${other.id} (${other.reading.primary})`);

        // Track original ID
        base.mergedVocabs.push({
            id: other.id,
            isBase: false,
            originalPrimaryReading: other.reading.primary,
            originalGlosses: other.senses[0]?.glosses.slice(0, 3) || []
        });

        // Merge readings if new
        if (!allReadings.has(other.reading.primary)) {
            base.reading.alternatives.push(other.reading.primary);
            allReadings.add(other.reading.primary);
        }
        for (const alt of other.reading.alternatives) {
            if (!allReadings.has(alt)) {
                base.reading.alternatives.push(alt);
                allReadings.add(alt);
            }
        }

        // Merge Senses, tagging them with the reading they apply to
        for (const sense of other.senses) {
            sense.appliesToReadings = [other.reading.primary];
            base.senses.push(sense);
        }

        // We could theoretically merge KKLC steps, but using the base (most frequent) is usually fine.
        // Or take the MIN step (earliest intro) if different. Let's take MIN just in case.
        if (other.kklcStep > 0 && other.kklcStep < base.kklcStep) {
            base.kklcStep = other.kklcStep;
            base.progression.kklcStep = other.kklcStep;
        }
    }

    mergedLogs.push(logEntry.join('\n'));
    mergedVocabulary.push(base);
}

// Write the merge log to a text file for review
const mergedLogPath = './public/data/compiled/merged_vocabs.log';
fs.mkdirSync(path.dirname(mergedLogPath), { recursive: true });
fs.writeFileSync(mergedLogPath, mergedLogs.join('\n\n'), 'utf-8');

// Sort by frequency and limit
let selected = mergedVocabulary
    .sort((a, b) => a.frequency.kanjiRank - b.frequency.kanjiRank)

if (BUILD_LIMITS.ENABLED_LIMIT) {
    selected = selected.slice(0, BUILD_LIMITS.MAX_VOCABULARY);
}

// Ensure output dirs
fs.mkdirSync('./public/data/compiled/vocab', { recursive: true });
fs.mkdirSync('./public/data/compiled/index', { recursive: true });

// Clean up potential stale indices to ensure atomicity
const indicesToClean = [
    './public/data/compiled/index/kklc.json',
    './public/data/compiled/index/frequency.json',
];

for (const indexFile of indicesToClean) {
    if (fs.existsSync(indexFile)) {
        fs.unlinkSync(indexFile);
    }
}

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
        path.join('./public/data/compiled/vocab', `${vocab.id}.json`),
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
    './public/data/compiled/index/kklc.json',
    JSON.stringify(kklcIndex, null, 2),
);

// Write frequency index
fs.writeFileSync(
    './public/data/compiled/index/frequency.json',
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