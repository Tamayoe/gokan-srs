// Progressive-enhancement client script for the home page search box (see HomePage.svelte).
// Deliberately plain DOM/TS, not a hydrated Svelte island: the only interactive piece on the
// entire site is this one search box, so pulling in a second Svelte compile pass (and the
// SSR/hydration markup matching it requires) for a single `<input>` isn't worth it. Built as
// its own Vite entry (see vite.config.ts) and linked from the prerendered home page only -
// vocab/kanji pages are fully static with no JS at all.

import type { SearchIndex, SearchIndexEntry } from '../models/index.model';
import { searchIndexPath, vocabPath } from '../lib/urls';

const MAX_RESULTS = 20;
const DEBOUNCE_MS = 120;

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): (...args: Args) => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: Args) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function matches(entry: SearchIndexEntry, query: string): boolean {
    const normalized = query.toLowerCase();
    return entry.w.includes(query) || entry.r.includes(query) || entry.m.toLowerCase().includes(normalized);
}

export function filterEntries(index: SearchIndex, rawQuery: string, maxResults: number): SearchIndexEntry[] {
    const query = rawQuery.trim();
    if (!query) return [];
    return index.filter(entry => matches(entry, query)).slice(0, maxResults);
}

function renderResults(list: HTMLUListElement, entries: SearchIndexEntry[]): void {
    list.replaceChildren();
    for (const entry of entries) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = vocabPath(entry.id);

        const kanji = document.createElement('span');
        kanji.className = 'jp';
        kanji.textContent = entry.w;

        const reading = document.createElement('span');
        reading.className = 'muted jp';
        reading.textContent = entry.r;

        const gloss = document.createElement('span');
        gloss.className = 'gloss';
        gloss.textContent = entry.m;

        a.append(kanji, reading, gloss);
        li.appendChild(a);
        list.appendChild(li);
    }
}

function init(): void {
    const input = document.querySelector<HTMLInputElement>('[data-search-input]');
    const status = document.querySelector<HTMLElement>('[data-search-status]');
    const results = document.querySelector<HTMLUListElement>('[data-search-results]');
    if (!input || !status || !results) return;

    let index: SearchIndex | null = null;
    let indexPromise: Promise<SearchIndex> | null = null;

    function loadIndex(): Promise<SearchIndex> {
        if (indexPromise) return indexPromise;
        status!.textContent = 'Loading search index...';
        indexPromise = fetch(searchIndexPath())
            .then(res => {
                if (!res.ok) throw new Error(`search index request failed: ${res.status}`);
                return res.json() as Promise<SearchIndex>;
            })
            .then(data => {
                index = data;
                status!.textContent = '';
                return data;
            })
            .catch(() => {
                status!.textContent = 'Search is unavailable right now.';
                throw new Error('search index unavailable');
            });
        return indexPromise;
    }

    const runSearch = debounce((rawQuery: string) => {
        const query = rawQuery.trim().toLowerCase();
        if (!query) {
            results!.replaceChildren();
            status!.textContent = '';
            return;
        }
        if (!index) return;

        const matched = filterEntries(index, rawQuery, MAX_RESULTS);
        renderResults(results!, matched);
        status!.textContent = matched.length === 0 ? `No results for "${rawQuery}".` : '';
    }, DEBOUNCE_MS);

    input.addEventListener('focus', () => {
        loadIndex().then(() => runSearch(input.value)).catch(() => {});
    }, { once: true });

    input.addEventListener('input', () => {
        if (index) {
            runSearch(input.value);
        } else {
            loadIndex().then(() => runSearch(input.value)).catch(() => {});
        }
    });
}

// Guarded so this module can be imported from Node-environment unit tests (see search.test.ts)
// without a DOM present, and so it only self-initializes in an actual browser.
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
