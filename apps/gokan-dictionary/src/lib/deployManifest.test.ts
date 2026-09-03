import { describe, it, expect } from 'vitest';
import { diffManifests, cacheControlFor, groupByCacheControl } from './deployManifest';

describe('diffManifests', () => {
    it('uploads only the files whose content hash changed', () => {
        const diff = diffManifests(
            { 'index.html': 'a', 'vocab/1/index.html': 'b', 'vocab/2/index.html': 'c' },
            { 'index.html': 'a', 'vocab/1/index.html': 'CHANGED', 'vocab/2/index.html': 'c' },
        );
        expect(diff.changed).toEqual(['vocab/1/index.html']);
        expect(diff.removed).toEqual([]);
        expect(diff.unchanged).toBe(2);
    });

    it('uploads files that are new since the last deploy', () => {
        const diff = diffManifests({ 'index.html': 'a' }, { 'index.html': 'a', 'kanji/index.html': 'n' });
        expect(diff.changed).toEqual(['kanji/index.html']);
    });

    it('reports keys that no longer exist so they can be pruned', () => {
        const diff = diffManifests({ 'index.html': 'a', 'vocab/9/index.html': 'x' }, { 'index.html': 'a' });
        expect(diff.removed).toEqual(['vocab/9/index.html']);
        expect(diff.changed).toEqual([]);
    });

    it('uploads everything when there is no previous manifest', () => {
        // First deploy, or a manifest that could not be read: we cannot know what is already
        // there, so fall back to a full upload rather than risk a partial deploy.
        const diff = diffManifests(null, { 'index.html': 'a', 'kanji/index.html': 'b' });
        expect(diff.changed).toEqual(['index.html', 'kanji/index.html']);
        expect(diff.removed).toEqual([]);
        expect(diff.unchanged).toBe(0);
    });

    it('uploads nothing when the build is byte-identical', () => {
        const manifest = { 'index.html': 'a', 'vocab/1/index.html': 'b' };
        const diff = diffManifests(manifest, { ...manifest });
        expect(diff.changed).toEqual([]);
        expect(diff.removed).toEqual([]);
        expect(diff.unchanged).toBe(2);
    });

    it('re-uploads every page when the stylesheet hash changes', () => {
        // The regression --size-only would have caused: hashed asset filenames are a fixed
        // length, so a page embedding a new stylesheet name has the same byte length as before.
        // Content hashing catches it; a size comparison would not.
        const previous = { 'assets/styles-AAAAAAAA.css': 'v1', 'vocab/1/index.html': 'page-v1' };
        const next = { 'assets/styles-BBBBBBBB.css': 'v2', 'vocab/1/index.html': 'page-v2' };
        const diff = diffManifests(previous, next);
        expect(diff.changed).toContain('vocab/1/index.html');
        expect(diff.changed).toContain('assets/styles-BBBBBBBB.css');
        expect(diff.removed).toEqual(['assets/styles-AAAAAAAA.css']);
    });
});

describe('cacheControlFor', () => {
    it('lets page HTML always revalidate', () => {
        expect(cacheControlFor('vocab/1/index.html')).toBe('public, max-age=0, must-revalidate');
    });

    it('gives the two unhashed data files a short TTL', () => {
        expect(cacheControlFor('data/search.json')).toBe('public, max-age=3600');
        expect(cacheControlFor('sitemap.xml')).toBe('public, max-age=3600');
    });

    it('marks content-hashed assets immutable', () => {
        expect(cacheControlFor('assets/styles-CPjhgttk.css')).toBe('public, max-age=31536000, immutable');
    });
});

describe('groupByCacheControl', () => {
    it('groups files so each header is one upload batch', () => {
        const groups = groupByCacheControl([
            'index.html',
            'vocab/1/index.html',
            'assets/app.css',
            'sitemap.xml',
        ]);
        expect(groups.get('public, max-age=0, must-revalidate')).toEqual(['index.html', 'vocab/1/index.html']);
        expect(groups.get('public, max-age=31536000, immutable')).toEqual(['assets/app.css']);
        expect(groups.get('public, max-age=3600')).toEqual(['sitemap.xml']);
    });
});
