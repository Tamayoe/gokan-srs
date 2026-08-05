import fs from 'fs';
import path from 'path';
import kuromoji from 'kuromoji';
import type { GrammarExample, GrammarExampleWord, GrammarJlptIndex, GrammarPoint } from '../src/models/grammar.model';
import type { SearchIndex } from '../src/models/index.model';

/**
 * Compiles the vendored hanabira.org-japanese-content grammar snapshot
 * (scripts/grammar/raw/*.json) into public/data/grammar/, resolving each
 * example sentence's content words against the compiled vocab dataset so the
 * quiz can decide, at review time, which words the user already knows (see
 * CLAUDE.md's Grammar section for the full design).
 *
 * Lives in gokan-srs itself rather than the gokan-dataset submodule: this repo
 * has no push access to that separate repository, so a vendored snapshot +
 * local build script is the only ingestion path available (issue #17's
 * "vendored snapshot vs. periodic re-sync" question, resolved as: vendored
 * snapshot, rebuilt manually via `bun run build:grammar` if hanabira's content
 * is ever refreshed). Source: https://github.com/tristcoil/hanabira.org-japanese-content
 * (Creative Commons, attribution required - see the credit link on the About page).
 */

const RAW_DIR = path.join(__dirname, 'grammar', 'raw');
const SEARCH_INDEX_PATH = path.join(__dirname, '..', 'dataset', 'compiled', 'index', 'search.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'grammar');

const LEVEL_FILES: Record<number, string> = {
    5: 'grammar_ja_N5_full_alphabetical_0001.json',
    4: 'grammar_ja_N4_full_alphabetical_0001.json',
    3: 'grammar_ja_N3_full_alphabetical_0001.json',
    2: 'grammar_ja_N2_full_alphabetical_0001.json',
    1: 'grammar_ja_N1_full_alphabetical_0001.json',
};

interface RawGrammarEntry {
    title: string;
    short_explanation: string;
    long_explanation: string;
    formation: string;
    examples: Array<{ jp: string; romaji: string; en: string }>;
}

// Content POS categories eligible to become a blank - particles, symbols, and
// auxiliary verbs are always shown literally (they carry the grammar
// construction itself, not a vocabulary item the user is being tested on).
const CONTENT_POS = new Set(['名詞', '動詞', '形容詞', '副詞']);

function buildVocabLookup(searchIndex: SearchIndex) {
    const byWrittenForm = new Map<string, { id: string; r: string }>();
    const byReading = new Map<string, { id: string; r: string }>();

    for (const entry of searchIndex) {
        if (!byWrittenForm.has(entry.w)) byWrittenForm.set(entry.w, { id: entry.id, r: entry.r });
        if (!byReading.has(entry.r)) byReading.set(entry.r, { id: entry.id, r: entry.r });
    }

    return { byWrittenForm, byReading };
}

function katakanaToHiragana(input: string): string {
    return input.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function tokenizeExample(
    tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>,
    lookup: ReturnType<typeof buildVocabLookup>,
    jp: string
): GrammarExampleWord[] {
    const tokens = tokenizer.tokenize(jp);
    const words: GrammarExampleWord[] = [];

    for (const token of tokens) {
        let match: { id: string; r: string } | undefined;

        if (CONTENT_POS.has(token.pos)) {
            match = lookup.byWrittenForm.get(token.surface_form) ?? lookup.byWrittenForm.get(token.basic_form);

            // Kana-only tokens (no kanji): also try a reading match, since they
            // won't appear under a kanji written form in the search index.
            if (!match && token.reading) {
                const hiraganaReading = katakanaToHiragana(token.reading);
                match = lookup.byReading.get(hiraganaReading);
            }
        }

        words.push(match
            ? { surface: token.surface_form, vocabId: match.id, reading: match.r }
            : { surface: token.surface_form, vocabId: null }
        );
    }

    return words;
}

async function main() {
    console.log('📖 Building grammar dataset...');

    if (!fs.existsSync(SEARCH_INDEX_PATH)) {
        throw new Error(`Vocab search index not found at ${SEARCH_INDEX_PATH}. Run 'git submodule update --init --recursive' and 'bun install --cwd dataset' first.`);
    }

    const searchIndex: SearchIndex = JSON.parse(fs.readFileSync(SEARCH_INDEX_PATH, 'utf-8'));
    const lookup = buildVocabLookup(searchIndex);

    const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) => {
        kuromoji.builder({ dicPath: path.join(__dirname, '..', 'node_modules', 'kuromoji', 'dict') }).build((err, t) => {
            if (err) reject(err);
            else resolve(t);
        });
    });

    const pointsDir = path.join(OUTPUT_DIR, 'points');
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(pointsDir, { recursive: true });

    const index: GrammarJlptIndex = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    let totalPoints = 0;
    let totalWords = 0;
    let matchedWords = 0;

    for (const [levelStr, filename] of Object.entries(LEVEL_FILES)) {
        const level = Number(levelStr);
        const raw: RawGrammarEntry[] = JSON.parse(fs.readFileSync(path.join(RAW_DIR, filename), 'utf-8'));
        const levelSlug = `n${level}`;

        raw.forEach((entry, i) => {
            const id = `${levelSlug}-${String(i + 1).padStart(3, '0')}`;

            const examples: GrammarExample[] = entry.examples.map(ex => {
                const words = tokenizeExample(tokenizer, lookup, ex.jp);
                totalWords += words.length;
                matchedWords += words.filter(w => w.vocabId !== null).length;
                return { jp: ex.jp, romaji: ex.romaji, en: ex.en, words };
            });

            const point: GrammarPoint = {
                id,
                title: entry.title,
                jlptLevel: level,
                shortExplanation: entry.short_explanation,
                longExplanation: entry.long_explanation,
                formation: entry.formation,
                examples,
            };

            fs.writeFileSync(path.join(pointsDir, `${id}.json`), JSON.stringify(point));
            index[level].push(id);
            totalPoints++;
        });

        console.log(`   - N${level}: ${raw.length} grammar points`);
    }

    fs.mkdirSync(path.join(OUTPUT_DIR, 'index'), { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index', 'jlpt.json'), JSON.stringify(index));

    console.log(`✅ Grammar dataset written to ${OUTPUT_DIR}`);
    console.log(`   - Grammar points: ${totalPoints}`);
    console.log(`   - Words tokenized: ${totalWords} (${matchedWords} resolved to a vocab id, ${(100 * matchedWords / totalWords).toFixed(1)}%)`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
