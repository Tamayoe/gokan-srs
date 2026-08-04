// Pure URL-building helpers, shared by the prerender script (to decide where to write files)
// and the page components (to link between vocab/kanji pages). Keeping this as the single
// source of truth means the file layout under dist/ and the hrefs rendered into pages can
// never drift apart.

import { SITE_URL } from './site';

export function vocabPath(id: string): string {
    return `/vocab/${id}/`;
}

export function kanjiPath(character: string): string {
    return `/kanji/${encodeURIComponent(character)}/`;
}

export function absoluteUrl(pathname: string): string {
    return new URL(pathname, SITE_URL).toString();
}
