#!/usr/bin/env bun
// Build-time static site generator. Run via `bun run build` (chained after `vite build`, see
// package.json) or standalone via `bun run prerender` once dist/ already has a client build.
//
// Why this exists as a hand-rolled script instead of using SvelteKit or another SSR
// framework: the resolved decision on issue #19 was "build-time pre-rendering rather than a
// full SSR framework" - kept deliberately lightweight. Svelte's own server renderer
// (svelte/server's render()) only turns a component into an HTML *fragment*, not a full
// document, and normally you'd get to that fragment via a framework's routing/build
// integration. Here that wiring is done by hand: scripts/svelte-ssr-loader.ts registers a Bun
// runtime plugin that compiles .svelte files with svelte/compiler's `generate: 'server'` mode
// directly (verified against Svelte 5.56's actual compiler/server-runtime API before writing
// this), completely independent of the Vite build. Vite's own `vite build` (run first, see
// package.json) has one job: produce the two browser-facing assets this script links into
// every generated page - the global stylesheet and the search script (vite.config.ts lists
// them as explicit rollup inputs) - resolved here via the client build's manifest.json rather
// than hardcoded filenames, since Vite content-hashes them.
import './svelte-ssr-loader';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'svelte/server';

import {
    resolveCompiledDir,
    listVocabIds,
    loadVocab,
    loadKanjiList,
    loadKanjiVocabIndex,
    loadSentences,
    loadSearchIndex,
} from '../src/lib/dataset.server';
import { vocabSummaryFrom } from '../src/lib/vocabSummary';
import { vocabMeta, kanjiMeta, homeMeta } from '../src/lib/seo';
import { vocabPath, kanjiPath } from '../src/lib/urls';
import { renderDocument } from '../src/lib/documentShell';
import { buildSitemapXml, buildRobotsTxt } from '../src/lib/sitemap';
import type { VocabSummary } from '../src/lib/types';
import type { Vocabulary } from '../src/models/vocabulary.model';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(APP_ROOT, 'dist');

const MAX_KANJI_VOCAB_LIST = 50;
const MAX_SENTENCES = 3;

interface ViteManifestEntry {
    file: string;
}

function readClientManifest(): Record<string, ViteManifestEntry> {
    const manifestPath = path.join(DIST_DIR, '.vite', 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`[prerender] ${manifestPath} not found - run "vite build" before prerendering.`);
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function writePage(distRelSegments: string[], html: string): void {
    const dir = path.join(DIST_DIR, ...distRelSegments);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
}

/** Resolves related-vocab ids to summaries, tracking (without spamming) any that don't resolve. */
function resolveSummaries(ids: string[], summaryById: Map<string, VocabSummary>, missing: Set<string>): VocabSummary[] {
    const resolved: VocabSummary[] = [];
    for (const id of ids) {
        const summary = summaryById.get(id);
        if (summary) {
            resolved.push(summary);
        } else {
            missing.add(id);
        }
    }
    return resolved;
}

async function main(): Promise<void> {
    const startedAt = Date.now();

    const compiledDir = resolveCompiledDir();
    const manifest = readClientManifest();
    const stylesheetHref = '/' + manifest['src/app.css'].file;
    const searchScriptHref = '/' + manifest['src/client/search.ts'].file;

    // Dynamic imports so scripts/svelte-ssr-loader.ts (imported above for its side effect) has
    // already registered before these .svelte files are compiled - see that file's comment.
    const { default: HomePage } = await import('../src/pages/HomePage.svelte');
    const { default: VocabPage } = await import('../src/pages/VocabPage.svelte');
    const { default: KanjiPage } = await import('../src/pages/KanjiPage.svelte');

    console.log('[prerender] loading dataset indexes...');
    const vocabIds = listVocabIds(compiledDir);
    const kanjiList = loadKanjiList(compiledDir);
    const kanjiVocabIndex = loadKanjiVocabIndex(compiledDir);
    const searchIndex = loadSearchIndex(compiledDir);

    // Built as a separate pass (rather than caching full Vocabulary objects while writing
    // pages below) so memory stays bounded to ~36k small {id, kanji, reading, gloss} records
    // instead of ~36k full parsed vocab files at once.
    console.log(`[prerender] indexing ${vocabIds.length} vocab summaries...`);
    const summaryById = new Map<string, VocabSummary>();
    for (const id of vocabIds) {
        summaryById.set(id, vocabSummaryFrom(loadVocab(compiledDir, id)));
    }

    const missingRelatedIds = new Set<string>();
    const sitemapPaths: string[] = ['/'];

    console.log(`[prerender] writing ${vocabIds.length} vocab pages...`);
    for (const id of vocabIds) {
        const vocab: Vocabulary = loadVocab(compiledDir, id);
        const components = resolveSummaries(vocab.components ?? [], summaryById, missingRelatedIds);
        const parents = resolveSummaries(vocab.parents ?? [], summaryById, missingRelatedIds);
        const sentences = (loadSentences(compiledDir, id) ?? []).slice(0, MAX_SENTENCES);

        const { body } = render(VocabPage, { props: { vocab, components, parents, sentences } });
        const meta = vocabMeta(vocab);
        const html = renderDocument({
            title: meta.title,
            description: meta.description,
            canonicalPath: vocabPath(id),
            bodyHtml: body,
            stylesheetHref,
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'DefinedTerm',
                name: vocab.writtenForm.kanji,
                description: meta.description,
            },
        });
        writePage(['vocab', id], html);
        sitemapPaths.push(vocabPath(id));
    }

    if (missingRelatedIds.size > 0) {
        console.warn(`[prerender] ${missingRelatedIds.size} components/parents referenced ids with no vocab file (skipped in output, not fatal).`);
    }

    console.log(`[prerender] writing ${kanjiList.length} kanji pages...`);
    for (const kanji of kanjiList) {
        const vocabIdsForKanji = kanjiVocabIndex[kanji.character] ?? [];
        const vocabList = vocabIdsForKanji
            .slice(0, MAX_KANJI_VOCAB_LIST)
            .map(id => summaryById.get(id))
            .filter((summary): summary is VocabSummary => Boolean(summary));

        const { body } = render(KanjiPage, {
            props: { kanji, vocabList, vocabTotalCount: vocabIdsForKanji.length },
        });
        const meta = kanjiMeta(kanji, vocabIdsForKanji.length);
        const html = renderDocument({
            title: meta.title,
            description: meta.description,
            canonicalPath: kanjiPath(kanji.character),
            bodyHtml: body,
            stylesheetHref,
        });
        // Written under the raw character, NOT percent-encoded, unlike kanjiPath()'s URL
        // string: static hosts decode the request URL's percent-escapes before resolving a
        // file on disk, so the on-disk name must be the literal UTF-8 character to match what
        // a browser actually requests when it navigates to kanjiPath()'s href.
        writePage(['kanji', kanji.character], html);
        sitemapPaths.push(kanjiPath(kanji.character));
    }

    console.log('[prerender] writing home page...');
    const { body: homeBody } = render(HomePage, {
        props: { vocabCount: vocabIds.length, kanjiCount: kanjiList.length },
    });
    const homeMetaValue = homeMeta();
    const homeHtml = renderDocument({
        title: homeMetaValue.title,
        description: homeMetaValue.description,
        canonicalPath: '/',
        bodyHtml: homeBody,
        stylesheetHref,
        scriptHref: searchScriptHref,
    });
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), homeHtml);

    console.log('[prerender] writing search index, sitemap.xml, and robots.txt...');
    fs.mkdirSync(path.join(DIST_DIR, 'data'), { recursive: true });
    fs.writeFileSync(path.join(DIST_DIR, 'data', 'search.json'), JSON.stringify(searchIndex));
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), buildSitemapXml(sitemapPaths));
    fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), buildRobotsTxt());

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[prerender] done: ${vocabIds.length} vocab pages, ${kanjiList.length} kanji pages, 1 home page in ${elapsedSeconds}s.`);
}

await main();
