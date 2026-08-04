// Lightweight cross-page view type. Used wherever a page needs to link to *another* vocab
// entry without embedding that entry's full Vocabulary object (kanji breakdown lists, a
// kanji's associated-vocab list, a word's components/parents) - the prerender script resolves
// these summaries once per referenced id and passes them down as props.

export interface VocabSummary {
    id: string;
    kanji: string;
    reading: string;
    gloss?: string;
}
