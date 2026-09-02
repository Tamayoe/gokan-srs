// Pure per-page SEO metadata builders. Kept separate from the Svelte components so they're
// trivially unit-testable without rendering anything, and separate from documentShell.ts
// (which only knows how to wrap an already-decided {title, description} into HTML).

import type { Vocabulary } from '../models/vocabulary.model';
import type { Kanji } from '../models/kanji.model';
import type { GrammarPoint } from '../models/grammar.model';
import { SITE_NAME } from './site';

export interface PageMeta {
    title: string;
    description: string;
}

const JLPT_LABEL = (level: number) => `N${level}`;

export function vocabMeta(vocab: Vocabulary): PageMeta {
    const gloss = vocab.senses[0]?.glosses[0];
    const jlpt = vocab.jlptLevel ? ` (JLPT ${JLPT_LABEL(vocab.jlptLevel)})` : '';

    const title = `${vocab.writtenForm.kanji} (${vocab.reading.primary})${jlpt} - ${SITE_NAME}`;
    const description = gloss
        ? `${vocab.writtenForm.kanji} (${vocab.reading.primary}): ${gloss}. Japanese dictionary entry with readings, meanings, and usage examples.`
        : `${vocab.writtenForm.kanji} (${vocab.reading.primary}) - Japanese dictionary entry with readings and meanings.`;

    return { title, description };
}

export function kanjiMeta(kanji: Kanji, vocabCount: number): PageMeta {
    const jlpt = kanji.steps.jlpt ? ` (JLPT ${JLPT_LABEL(kanji.steps.jlpt)})` : '';
    const title = `${kanji.character}${jlpt} - Kanji - ${SITE_NAME}`;
    const description = vocabCount > 0
        ? `The kanji ${kanji.character}: KKLC step, JLPT level, and ${vocabCount} vocabulary word${vocabCount === 1 ? '' : 's'} that use it.`
        : `The kanji ${kanji.character}: KKLC step and JLPT level.`;

    return { title, description };
}

export function grammarMeta(point: GrammarPoint): PageMeta {
    const romaji = point.romaji ? ` (${point.romaji})` : '';
    const title = `${point.title}${romaji} - JLPT ${JLPT_LABEL(point.jlptLevel)} Grammar - ${SITE_NAME}`;

    // The short explanation is already a one-line summary written for a learner, so it makes a
    // better meta description than anything synthesised from the other fields. Trimmed to keep
    // the whole description inside the ~155 chars Google typically renders.
    const summary = point.shortExplanation.replace(/\s+/g, ' ').trim();
    const description = `${point.title}: ${truncate(summary, 120)} JLPT ${JLPT_LABEL(point.jlptLevel)} Japanese grammar with formation and example sentences.`;

    return { title, description };
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function grammarIndexMeta(pointCount: number): PageMeta {
    return {
        title: `Japanese Grammar Points by JLPT Level - ${SITE_NAME}`,
        description: `All ${pointCount} Japanese grammar points, organized from JLPT N5 to N1, each with its formation pattern, explanation, and example sentences.`,
    };
}

export function homeMeta(): PageMeta {
    return {
        title: SITE_NAME,
        description: 'Look up Japanese kanji and vocabulary: readings, meanings, JLPT levels, and example sentences.',
    };
}
