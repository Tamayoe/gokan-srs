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

    // We instantiate Deinflector (it's static so just class ref is fine)
    // Map: vocabId -> Sentence[]
    const vocabSentences = new Map<string, Sentence[]>();

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let sentenceCount = 0;
    const progressInterval = 5000;

    // Importing Deinflector dynamically or we need to compile it?
    // Since this script runs via bun, we can just import the .ts file if supported?
    // Bun supports TS natively. But we need relative path from scripts/ to src/utils/
    // Let's assume standard import works.
    const { Deinflector } = await import('../src/utils/deinflector');

    for (const [_, sentence] of sentencesMap) {
        sentenceCount++;
        if (sentenceCount % progressInterval === 0) {
            process.stdout.write(`Processing sentence ${sentenceCount}/${sentencesMap.size}...\r`);
        }

        const text = sentence.original;
        const coveredIndices = new Array(text.length).fill(false);

        // Structure to holds matches: vocabId -> { start, length }
        // We might have multiple matches for same vocab? 
        // The Sentence interface says `Record<string, { start: number, length: number }>`
        // implying one match per vocab. 
        // If a word appears twice, we'll just store the FIRST one (or best one).
        // For learning purposes, highlighting the first occurrence is sufficient.
        const matches: Record<string, { start: number, length: number }> = {};
        const matchedVocabIds: string[] = [];

        // Greedy matching with Deinflection
        // Iterate through every character position in sentence
        for (let i = 0; i < text.length; i++) {
            if (coveredIndices[i]) continue; // Skip if already claimed by a longer match? 
            // Actually, we want longest match at this position.

            // We need to find the longest vocab that matches starting at i
            // But we don't know the length.
            // We can iterate sortedVocab? Too slow (20k * len).

            // Better approach for build script (offline):
            // Check substrings starting at i of varying lengths (e.g. 10 chars down to 1)
            // Deinflect the substring.
            // Check if deinflected term is in vocabMap.

            let bestMatch: { vocabId: string, length: number, term: string } | null = null;

            // Try lengths from 15 down to 1 (Japanese words rarely exceed 15 chars)
            const maxLen = Math.min(15, text.length - i);

            for (let len = maxLen; len >= 1; len--) {
                const substring = text.substring(i, i + len);

                // 1. Direct Match?
                if (vocabMap.has(substring)) {
                    // Found a match!
                    bestMatch = { vocabId: vocabMap.get(substring)!, length: len, term: substring };
                    break; // Found longest at this position (since we go desc)
                }

                // 2. Deinflection Match?
                // Only deinflect if not hiragana/katakana only? (Optional optimization)
                // But verbs are often hiragana+kanji.

                const candidates = Deinflector.deinflect(substring);
                for (const candidate of candidates) {
                    if (vocabMap.has(candidate.term)) {
                        // Found a match via deinflection!
                        // e.g. substring "食べました" (len 5) -> "食べる" (vocab)
                        bestMatch = { vocabId: vocabMap.get(candidate.term)!, length: len, term: candidate.term };
                        break;
                    }
                }

                if (bestMatch) break;
            }

            if (bestMatch) {
                // We found a match starting at i
                // Mark indices as covered
                for (let k = 0; k < bestMatch.length; k++) {
                    coveredIndices[i + k] = true;
                }

                // Store match
                const vId = bestMatch.vocabId;
                if (!matches[vId]) {
                    matches[vId] = { start: i, length: bestMatch.length };
                    matchedVocabIds.push(vId);
                }

                // Advance i (minus 1 because loop increments)
                i += bestMatch.length - 1;
            }
        }

        // --- FILTERING LOGIC ---
        // 1. Calculate Coverage
        let coveredCount = 0;
        for (let i = 0; i < coveredIndices.length; i++) {
            if (coveredIndices[i]) coveredCount++;
        }

        const coverageRatio = coveredCount / text.length;

        // Discard if coverage is too low (likely contains many unknown words)
        // Using 0.5 as threshold
        if (coverageRatio < 0.5) {
            continue;
        }

        // 2. Populate Sentence Object
        sentence.vocabIds = matchedVocabIds;
        sentence.matches = matches;

        // Add sentence to all matched vocab bucket files
        for (const vocabId of matchedVocabIds) {
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
