import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { Vocabulary } from '../src/models/vocabulary.model';
import type { Sentence } from '../src/models/sentence.model';

// --- Configuration ---
const INPUT_SENTENCES_FILE = './data/raw/Sentence pairs in Japanese-English - 2026-02-15.tsv';
const INPUT_INDICES_FILE = './data/raw/jpn_indices.csv'; // Format: JP_ID <tab> EN_ID <tab> INDICES
const VOCAB_DIR = './data/compiled/vocab';
const OUTPUT_DIR = './data/compiled/sentences';

// --- Helpers ---

// Check if a character is Japanese (Kanji, Hiragana, Katakana)
// Ranges:
// Hiragana: 3040-309F
// Katakana: 30A0-30FF
// Kanji: 4E00-9FAF
// Punctuation and others are largely ignored for "word starting" logic, 
// but we just need this to identifying potential start of words?
// Actually, our greedy tokenizer works by substrings, so we verify matches against known vocab.
function isJapaneseChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 0x3040 && code <= 0x30FF) || (code >= 0x4E00 && code <= 0x9FAF);
}

// --- Main ---

async function main() {
    console.log('🏗️  Starting Sentence Dataset Build...');

    // 1. Load Vocabulary
    // We need map: writtenForm -> vocabId
    // Since we want greedy matching, we'll sort vocab keys by length (desc)
    console.log('📚 Loading vocabulary...');
    const vocabMap = new Map<string, string>(); // written -> id

    if (!fs.existsSync(VOCAB_DIR)) {
        console.error(`❌ Vocabulary directory not found: ${VOCAB_DIR}`);
        process.exit(1);
    }

    const vocabFiles = fs.readdirSync(VOCAB_DIR).filter(f => f.endsWith('.json'));
    let loadedVocabCount = 0;

    for (const file of vocabFiles) {
        const content = fs.readFileSync(path.join(VOCAB_DIR, file), 'utf-8');
        const vocab = JSON.parse(content) as Vocabulary;

        // We track the primary written form
        // Note: Some vocab have alternatives, but usually `writtenForm.kanji` is the main one.
        // If `writtenForm.kanji` is mixed (e.g. "受け入れる"), that's what we match.
        vocabMap.set(vocab.writtenForm.kanji, vocab.id);
        loadedVocabCount++;
    }
    console.log(`✅ Loaded ${loadedVocabCount} vocabulary items.`);

    // Sort vocabulary by length descending for greedy match
    const sortedVocab = Array.from(vocabMap.keys()).sort((a, b) => b.length - a.length);

    // 2. Parse JPN Indices (Reading Hints)
    // Structure: JP_ID -> Indices String
    console.log('📖 Loading reading indices...');
    const indicesMap = new Map<string, string>();

    // Using readline for memory efficiency if file is large
    const indicesStream = fs.createReadStream(INPUT_INDICES_FILE);
    const indicesReader = readline.createInterface({
        input: indicesStream,
        crlfDelay: Infinity
    });

    for await (const line of indicesReader) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length >= 3) {
            // Format: JP_ID <tab> EN_ID <tab> INDICES ...
            // We only need JP_ID -> INDICES. 
            // Note: A JP_ID might appear multiple times with different EN_IDs or same indices.
            // We'll just store the index string for the JP_ID.
            const jpId = parts[0];
            const indices = parts[2];
            indicesMap.set(jpId, indices);
        }
    }
    console.log(`✅ Loaded reading indices for ${indicesMap.size} sentences.`);

    // 3. Parse Sentences
    // Structure: sentences[JP_ID] = Sentence object
    console.log('📜 Loading sentences...');
    const sentencesMap = new Map<string, Sentence>();

    const sentencesStream = fs.createReadStream(INPUT_SENTENCES_FILE);
    const sentencesReader = readline.createInterface({
        input: sentencesStream,
        crlfDelay: Infinity
    });

    for await (const line of sentencesReader) {
        if (!line.trim()) continue;
        const parts = line.split('\t');

        // Format: JP_ID <tab> JP_SENTENCE <tab> EN_ID <tab> EN_SENTENCE
        if (parts.length >= 4) {
            const jpId = parts[0];
            const jpText = parts[1];
            const enId = parts[2];
            const enText = parts[3];

            if (!sentencesMap.has(jpId)) {
                sentencesMap.set(jpId, {
                    id: jpId,
                    original: jpText,
                    en: [],
                    indices: indicesMap.get(jpId),
                    vocabIds: []
                });
            }

            const sentence = sentencesMap.get(jpId)!;
            // Add translation if not duplicate
            if (!sentence.en.some(e => e.id === enId)) {
                sentence.en.push({ id: enId, text: enText });
            }
        }
    }
    console.log(`✅ Loaded ${sentencesMap.size} unique Japanese sentences.`);

    // 4. Tokenize & Distribute
    console.log('🔍 Tokenizing and linking sentences to vocabulary...');

    // Map: vocabId -> Sentence[]
    const vocabSentences = new Map<string, Sentence[]>();

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let sentenceCount = 0;
    const progressInterval = 5000;

    for (const [_, sentence] of sentencesMap) {
        sentenceCount++;
        if (sentenceCount % progressInterval === 0) {
            process.stdout.write(`Processing sentence ${sentenceCount}/${sentencesMap.size}...\r`);
        }

        let text = sentence.original;

        // Greedy tokenization
        // We look for known vocab in the sentence.
        // Optimization: We check every substring or use regex?
        // With 20k vocab and 150k sentences, simpler is better.
        // We scan the sentence string. 

        // Naive greedy approach:
        // Try to match longest words first at every position? 
        // No, that's partial overlap.
        // Simple "text contains word" check is fast but might find "ill" in "will".
        // HOWEVER, Japanese doesn't use spaces. "受け入れる" contains "入れる".
        // We specifically want to associate "受け入れる" with that vocab, and NOT "入れる".

        // Algorithm:
        // 1. Find all matches of all vocab words in the sentence.
        //    (start, end, vocabId, length)
        // 2. Resolve overlaps: if overlaps, keep longest.

        // Optimization: checking 20k vocab against 1 text is slow (20k * N).
        // Better: iterate text positions, try to match vocab (Trie-like).
        // Since we don't have a trie, we can filter `sortedVocab` (which is length desc).

        // For build script, we can be a bit inefficient but 20k * 150k is 3 billion ops. Too slow.
        // We need a faster check. A Trie would be best.
        // But let's implementing a "remove matched" strategy.
        // 1. For each vocab in sortedVocab (longest first):
        // 2. If sentence contains vocab:
        //    - valid match? 
        //    - We mark those characters as "consumed" or just verify it's not part of a larger match?
        //    - Actually, if we iterate longest first:
        //      If we find "受け入れる", we associate.
        //      Later we find "入れる". If it's at same position (part of larger), we shouldn't assoc?
        //      Or is it okay to associate both? 
        //      User requirement: "if we have 2 vocabs... correct is only the first one... prevent incorrect matches"

        // So we need to consume the string.
        // Let's use a bitmask or array of booleans for the sentence characters.

        const coveredIndices = new Array(sentence.original.length).fill(false);
        const matches: string[] = []; // vocabIds linked (preserve order or set?)

        // Check sorted vocab (longest first)
        for (const word of sortedVocab) {
            // Quick check if word exists in sentence
            let startIndex = text.indexOf(word);
            while (startIndex !== -1) {
                // Check if this range is already covered
                const endIndex = startIndex + word.length;
                let isFree = true;
                for (let i = startIndex; i < endIndex; i++) {
                    if (coveredIndices[i]) {
                        isFree = false;
                        break;
                    }
                }

                if (isFree) {
                    // It's a valid match!
                    // Mark indices
                    for (let i = startIndex; i < endIndex; i++) {
                        coveredIndices[i] = true;
                    }
                    // Add to matches
                    matches.push(vocabMap.get(word)!);
                }

                startIndex = text.indexOf(word, startIndex + 1);
            }
        }

        // --- FILTERING LOGIC ---
        // 1. Calculate Coverage: How much of the sentence is "known" vocab?
        let coveredCount = 0;
        for (let i = 0; i < coveredIndices.length; i++) {
            if (coveredIndices[i]) coveredCount++;
        }

        // We ignore punctuation/symbols in the "total length" ideally, but for now raw ratio is okay.
        // A minimal threshold of 60% might effectively filter out "I [unknown] [unknown] [unknown]" sentences.
        // User requested: "sentences that don't contain only vocabs that are compiled are irrelevant"
        // This implies a high standard. Let's start with 0.5 (50%) to be safe but filtering "junk".
        // Actually, Japanese has many particles (ha, ga, no, ni, wo...) which are short. 
        // If we don't have particles in vocab list, coverage will drop. 
        // Let's settle on a reasonable heuristic: must have at least 2 words OR >50% coverage?
        // Or simply: if matches.length == 0, discard (obviously).

        const coverageRatio = coveredCount / sentence.original.length;

        // Discard if coverage is too low (likely contains many unknown words)
        if (coverageRatio < 0.5) {
            continue;
        }

        // 2. Populate vocabIds
        // Deduplicate matches for the Sentence object
        const uniqueVocabIds = Array.from(new Set(matches));
        sentence.vocabIds = uniqueVocabIds;

        // Add sentence to all matched vocab bucket files
        for (const vocabId of uniqueVocabIds) {
            if (!vocabSentences.has(vocabId)) {
                vocabSentences.set(vocabId, []);
            }
            vocabSentences.get(vocabId)!.push(sentence);
        }
    }
    console.log(`\n✅ Processed all sentences.`);

    // 5. Write Outputs
    console.log('💾 Writing sentence files...');
    let filesWritten = 0;

    // Clear output dir first? No, we might overwrite.

    for (const [vocabId, sentences] of vocabSentences) {
        fs.writeFileSync(
            path.join(OUTPUT_DIR, `${vocabId}.json`),
            JSON.stringify(sentences, null, 2)
        );
        filesWritten++;
    }

    console.log(`✅ Generated ${filesWritten} sentence files.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
