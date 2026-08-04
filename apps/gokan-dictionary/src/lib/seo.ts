// Pure per-page SEO metadata builders. Kept separate from the Svelte components so they're
// trivially unit-testable without rendering anything, and separate from documentShell.ts
// (which only knows how to wrap an already-decided {title, description} into HTML).

import type { Vocabulary } from '../models/vocabulary.model';
import type { Kanji } from '../models/kanji.model';
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

export function homeMeta(): PageMeta {
    return {
        title: SITE_NAME,
        description: 'Look up Japanese kanji and vocabulary: readings, meanings, JLPT levels, and example sentences.',
    };
}
