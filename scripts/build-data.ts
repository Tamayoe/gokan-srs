import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { Sense, Vocabulary } from '../src/models/vocabulary.model';
import type { Sentence } from '../src/models/sentence.model';
import type { Kanji } from '../src/models/kanji.model';
import { JMDict } from "../src/models/data.model";
import { buildMiscFlags } from './build-common';
import { BUILD_LIMITS } from './build-constants';

// --- Configuration ---
const INPUT_JMDICT_FILE = './data/raw/jmdict.json';
const INPUT_JPDB_FILE = './data/raw/jpdb_v2.2_freq_list_2024-10-13.json';
const INPUT_KANJI_FILE = './data/compiled/kanji.json';
const INPUT_SENTENCES_FILE = './data/raw/Sentence pairs in Japanese-English - 2026-02-15.tsv';
const INPUT_INDICES_FILE = './data/raw/jpn_indices.csv';

const OUTPUT_VOCAB_DIR = './data/compiled/vocab';
const OUTPUT_SENTENCES_DIR = './data/compiled/sentences';
const OUTPUT_INDEX_DIR = './data/compiled/index';

// --- Types ---
interface JPDBEntry {
    frequency: number;
    kanaFrequency: number | null;
}
type JPDBData = Record<string, Record<string, JPDBEntry>>;

interface BuildVocabulary extends Vocabulary {
    kklcStep: number;
    isCommon: boolean;
}

interface FrequencyIndexEntry {
    id: string;
    containedKanji: string[];
}

// --- Main ---

async function main() {
    console.log('🏗️  Starting Unified Data Build...');

    // 0. Deinflector Import (Dynamic)
    const { Deinflector } = await import('../src/utils/deinflector');

    // 1. Load Reference Data
    console.log('📚 Loading reference data...');

    // Kanji Data for KKLC mapping
    const kanjiData: Kanji[] = JSON.parse(fs.readFileSync(INPUT_KANJI_FILE, 'utf-8'));
    const kklcMap = new Map<string, number>();
    for (const k of kanjiData) {
        if (k.steps?.kklc) {
            kklcMap.set(k.character, k.steps.kklc);
        }
    }

    // JMDict
    console.log('   - JMDict...');
    const jmdict: JMDict = JSON.parse(fs.readFileSync(INPUT_JMDICT_FILE, 'utf-8'));

    // JPDB
    console.log('   - JPDB...');
    const jpdb: JPDBData = JSON.parse(fs.readFileSync(INPUT_JPDB_FILE, 'utf-8'));

    // 2. Build Candidate Vocabulary List
    console.log('🔎 Processing vocabulary candidates...');

    // Helper to extract kanji
    function extractKanji(word: string): string[] {
        return [...word].filter(c => /[\u4e00-\u9faf]/.test(c));
    }

    // Map: vocabId -> BuildVocabulary object
    const candidateVocab = new Map<string, BuildVocabulary>();
    // Map: writtenForm -> vocabId (for sentence matching)
    // Note: If multiple vocabs have same written form, we might have collisions.
    // JMDict IDs are unique. We'll prioritize common/higher freq ones if collision?
    // Current build-sentences just used map.set overwriting.
    // To match correctly, we might need a list of IDs per written form, but for optimization 
    // let's stick to the primary one or just overwrite for now as per original script.
    const writtenToVocabId = new Map<string, string>();


    for (const entry of jmdict.words) {
        if (!entry.kanji.length || !entry.kana.length) continue;

        // Relaxed check: Use common kanji if available, otherwise use first
        const primaryKanji = entry.kanji.find(k => k.common) ?? entry.kanji[0];
        if (!primaryKanji) continue;

        const kanjiText = primaryKanji.text;
        const containedKanji = extractKanji(kanjiText);
        if (!containedKanji.length) continue;

        // Calculate primary reading
        const primaryReading =
            entry.kana.find(k => k.common && k.appliesToKanji.includes("*"))?.text
            ?? entry.kana[0].text;

        // Match JPDB frequency
        const jpdbKanjiEntry = jpdb[kanjiText];
        let jpdbEntry: { kanjiRank?: number; hiraganaRank?: number } | null = null;

        if (jpdbKanjiEntry) {
            const readingEntry = jpdbKanjiEntry[primaryReading];
            if (readingEntry) {
                jpdbEntry = {
                    kanjiRank: readingEntry.frequency,
                    hiraganaRank: readingEntry.kanaFrequency ?? undefined,
                };
            } else {
                const firstReading = Object.values(jpdbKanjiEntry)[0];
                if (firstReading) {
                    jpdbEntry = {
                        kanjiRank: firstReading.frequency,
                        hiraganaRank: firstReading.kanaFrequency ?? undefined,
                    };
                }
            }
        }

        if (!jpdbEntry?.kanjiRank) continue;

        const kklcStep = Math.max(
            ...containedKanji.map(k => kklcMap.get(k) ?? 0),
        );
        if (!kklcStep) continue;

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

        const vocabObj: BuildVocabulary = {
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
            kklcStep,
            isCommon: primaryKanji.common,
        };

        candidateVocab.set(entry.id, vocabObj);

        // Populate lookup map for sentence tokenizer
        // Use primary kanji form
        writtenToVocabId.set(kanjiText, entry.id);
    }

    console.log(`   - Found ${candidateVocab.size} candidate vocabulary items.`);


    // 3. Process Sentences & Calculate Usage
    console.log('📜 Processing sentences to find usage...');

    // Sort vocab keys by length descending for greedy match
    const sortedVocabKeys = Array.from(writtenToVocabId.keys()).sort((a, b) => b.length - a.length);

    // Map: vocabId -> Use Count
    const vocabUsageCount = new Map<string, number>();

    // Map: vocabId -> Sentence[] (Buffer for final output)
    const vocabSentencesMap = new Map<string, Sentence[]>();

    // Load Indices
    const indicesMap = new Map<string, string>();
    const indicesStream = fs.createReadStream(INPUT_INDICES_FILE);
    const indicesReader = readline.createInterface({ input: indicesStream, crlfDelay: Infinity });
    for await (const line of indicesReader) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length >= 3) {
            indicesMap.set(parts[0], parts[2]);
        }
    }

    // Load Sentences
    const sentencesMap = new Map<string, Sentence>();
    const sentencesStream = fs.createReadStream(INPUT_SENTENCES_FILE);
    const sentencesReader = readline.createInterface({ input: sentencesStream, crlfDelay: Infinity });

    for await (const line of sentencesReader) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length >= 4) {
            const [jpId, jpText, enId, enText] = parts;
            if (!sentencesMap.has(jpId)) {
                sentencesMap.set(jpId, {
                    id: jpId,
                    original: jpText,
                    en: [],
                    indices: indicesMap.get(jpId),
                    vocabIds: []
                });
            }
            const s = sentencesMap.get(jpId)!;
            if (!s.en.some(e => e.id === enId)) {
                s.en.push({ id: enId, text: enText });
            }
        }
    }

    // Tokenize
    let processedSentences = 0;
    const reportInterval = 5000;

    for (const [_, sentence] of sentencesMap) {
        processedSentences++;
        if (processedSentences % reportInterval === 0) {
            process.stdout.write(`   - Scanned ${processedSentences}/${sentencesMap.size} sentences...\r`);
        }

        const text = sentence.original;
        const coveredIndices = new Array(text.length).fill(false);
        const matches: Record<string, { start: number, length: number }> = {};
        const matchedVocabIds: string[] = [];

        for (let i = 0; i < text.length; i++) {
            if (coveredIndices[i]) continue;

            let bestMatch: { vocabId: string, length: number } | null = null;
            const maxLen = Math.min(15, text.length - i);

            // Optimization: Only check substrings that *could* be in our vocab list
            // But we have sortedVocabKeys which is just a list of strings throughout the whole dictionary.
            // Iterating that is O(N_vocab). Too slow inside sentence loop.
            // Better: substring checks against Map O(1).

            for (let len = maxLen; len >= 1; len--) {
                const substring = text.substring(i, i + len);

                // 1. Direct Match
                if (writtenToVocabId.has(substring)) {
                    bestMatch = { vocabId: writtenToVocabId.get(substring)!, length: len };
                    break;
                }

                // 2. Deinflection
                const candidates = Deinflector.deinflect(substring);
                for (const candidate of candidates) {
                    if (writtenToVocabId.has(candidate.term)) {
                        bestMatch = { vocabId: writtenToVocabId.get(candidate.term)!, length: len };
                        break;
                    }
                }
                if (bestMatch) break;
            }

            if (bestMatch) {
                // Register Match
                for (let k = 0; k < bestMatch.length; k++) coveredIndices[i + k] = true;

                const vId = bestMatch.vocabId;
                if (!matches[vId]) {
                    matches[vId] = { start: i, length: bestMatch.length };
                    matchedVocabIds.push(vId);
                }
                i += bestMatch.length - 1;
            }
        }

        // Filter low coverage (optional, keeping from original script)
        const coveredCount = coveredIndices.filter(Boolean).length;
        if ((coveredCount / text.length) < 0.5) continue;

        // Save results
        sentence.vocabIds = matchedVocabIds;
        sentence.matches = matches;

        for (const vid of matchedVocabIds) {
            // Increment usage count for filtering
            vocabUsageCount.set(vid, (vocabUsageCount.get(vid) ?? 0) + 1);

            // Store sentence for output (if vocab survives filter)
            if (!vocabSentencesMap.has(vid)) {
                vocabSentencesMap.set(vid, []);
            }
            vocabSentencesMap.get(vid)!.push(sentence);
        }
    }
    console.log(`\n   - Done scanning.`);

    // 4. Filter Vocabulary
    console.log('✂️  Filtering vocabulary...');

    // Sort all candidates by frequency (default sort)
    // Note: candidateVocab values are unsorted. Convert to array.
    const sortedCandidates = Array.from(candidateVocab.values())
        .sort((a, b) => a.frequency.kanjiRank - b.frequency.kanjiRank);

    const FINAL_VOCAB: BuildVocabulary[] = [];

    // Counters
    let keptByFrequency = 0;
    let keptByUsage = 0;
    let dropped = 0;

    const limit = BUILD_LIMITS.ENABLED_LIMIT ? BUILD_LIMITS.MAX_VOCABULARY : Number.MAX_SAFE_INTEGER;
    // Actually, user wants "Keep uncommon IF in sentence".
    // We should implement the threshold logic.
    // If we have ENABLED_LIMIT (hard cap), we might just slice. 
    // But let's assume we want the smart filtering.

    for (const vocab of sortedCandidates) {
        // Condition 1: Marked as Common in JMDict
        // (We trust the dictionary's 'common' flag on the primary kanji)
        const isCommon = vocab.isCommon;

        // Condition 2: Used in Sentences
        const usage = vocabUsageCount.get(vocab.id) ?? 0;
        const isUsed = usage > 0;

        // Retention Logic
        if (isCommon) {
            // If hard limit matches, check index? 
            // If we strictly follow limit, we assume sortedCandidates is freq sorted.
            // But we only want to apply limit to the *result*?
            // "only retain uncommon vocabs ... if we find them in sentences"

            // Should we apply a hard MAX cap as well? 
            // If ENABLED_LIMIT is true (e.g. 10000), we stick to that absolute number?
            // Or does "ENABLED_LIMIT" mean "Use dev mode small subset"?
            // Usually it means dev mode subset.

            if (BUILD_LIMITS.ENABLED_LIMIT && FINAL_VOCAB.length >= limit) {
                dropped++;
                continue;
            }

            FINAL_VOCAB.push(vocab);
            keptByFrequency++;
        } else if (isUsed) {
            // It's uncommon, but used in sentences. Keep it!
            if (BUILD_LIMITS.ENABLED_LIMIT && FINAL_VOCAB.length >= limit) {
                dropped++;
                continue;
            }
            FINAL_VOCAB.push(vocab);
            keptByUsage++;
        } else {
            // Uncommon and unused. Drop.
            dropped++;
        }
    }

    console.log(`   - Kept ${keptByFrequency} common words.`);
    console.log(`   - Kept ${keptByUsage} uncommon words (used in sentences).`);
    console.log(`   - Dropped ${dropped} words.`);
    console.log(`   - Final Dataset Size: ${FINAL_VOCAB.length} words.`);


    // 5. Write Outputs
    console.log('💾 Writing compiled data...');

    // Clean output directories
    if (fs.existsSync(OUTPUT_VOCAB_DIR)) fs.rmSync(OUTPUT_VOCAB_DIR, { recursive: true, force: true });
    if (fs.existsSync(OUTPUT_SENTENCES_DIR)) fs.rmSync(OUTPUT_SENTENCES_DIR, { recursive: true, force: true });
    // Keep index dir structure but maybe clean files? Build script handles specific index files.
    // Ensure directories exist
    fs.mkdirSync(OUTPUT_VOCAB_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_SENTENCES_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_INDEX_DIR, { recursive: true });

    // Clean old indices
    if (fs.existsSync(`${OUTPUT_INDEX_DIR}/kklc.json`)) fs.unlinkSync(`${OUTPUT_INDEX_DIR}/kklc.json`);
    if (fs.existsSync(`${OUTPUT_INDEX_DIR}/frequency.json`)) fs.unlinkSync(`${OUTPUT_INDEX_DIR}/frequency.json`);

    // Indices
    const kklcIndex: Record<number, string[]> = {};
    const frequencyIndex: FrequencyIndexEntry[] = [];

    let vocabWritten = 0;
    let sentencesWritten = 0;

    for (const vocab of FINAL_VOCAB) {
        const { kklcStep, ...cleanVocab } = vocab;

        // 1. Write Vocab File
        fs.writeFileSync(
            path.join(OUTPUT_VOCAB_DIR, `${vocab.id}.json`),
            JSON.stringify(cleanVocab, null, 2)
        );
        vocabWritten++;

        // 2. Write Sentences File (if exists)
        const sentences = vocabSentencesMap.get(vocab.id);
        if (sentences && sentences.length > 0) {
            fs.writeFileSync(
                path.join(OUTPUT_SENTENCES_DIR, `${vocab.id}.json`),
                JSON.stringify(sentences, null, 2)
            );
            sentencesWritten++;
        }

        // 3. Update Indexes
        // KKLC
        if (!kklcIndex[kklcStep]) kklcIndex[kklcStep] = [];
        kklcIndex[kklcStep].push(vocab.id);

        // Frequency
        frequencyIndex.push({
            id: vocab.id,
            containedKanji: vocab.writtenForm.containedKanji,
        });
    }

    // Write Indices
    fs.writeFileSync(
        path.join(OUTPUT_INDEX_DIR, 'kklc.json'),
        JSON.stringify(kklcIndex, null, 2)
    );
    fs.writeFileSync(
        path.join(OUTPUT_INDEX_DIR, 'frequency.json'),
        JSON.stringify(frequencyIndex, null, 2)
    );

    console.log(`✅ Build Complete!`);
    console.log(`   - Vocab Files: ${vocabWritten}`);
    console.log(`   - Sentence Files: ${sentencesWritten}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
