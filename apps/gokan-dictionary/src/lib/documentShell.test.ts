import { describe, it, expect } from 'vitest';
import { escapeHtml, renderDocument } from './documentShell';
import { vocabPath, absoluteUrl } from './urls';

describe('escapeHtml', () => {
    it('escapes the five HTML-significant characters', () => {
        expect(escapeHtml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    });

    it('leaves plain text untouched', () => {
        expect(escapeHtml('思う')).toBe('思う');
    });
});

describe('renderDocument', () => {
    const base = {
        title: '思う - Gokan Dictionary',
        description: 'to think, to consider',
        canonicalPath: vocabPath('1589350'),
        bodyHtml: '<main>hello</main>',
        stylesheetHref: '/assets/styles-abc123.css',
    };

    it('includes an escaped title and description', () => {
        const html = renderDocument({ ...base, title: '<script>alert(1)</script>' });
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('resolves the canonical path to an absolute URL', () => {
        const html = renderDocument(base);
        const canonical = absoluteUrl(vocabPath('1589350'));
        expect(canonical).toContain('/dictionary/vocab/1589350/');
        expect(html).toContain(`<link rel="canonical" href="${canonical}" />`);
        expect(html).toContain(`<meta property="og:url" content="${canonical}" />`);
    });

    it('links the stylesheet', () => {
        const html = renderDocument(base);
        expect(html).toContain('<link rel="stylesheet" href="/assets/styles-abc123.css" />');
    });

    it('omits the script tag when scriptHref is not provided', () => {
        const html = renderDocument(base);
        expect(html).not.toContain('<script type="module"');
    });

    it('includes the script tag when scriptHref is provided', () => {
        const html = renderDocument({ ...base, scriptHref: '/assets/search-xyz.js' });
        expect(html).toContain('<script type="module" src="/assets/search-xyz.js"></script>');
    });

    it('embeds structuredData as JSON-LD when provided', () => {
        const html = renderDocument({ ...base, structuredData: { '@type': 'DefinedTerm', name: '思う' } });
        expect(html).toContain('<script type="application/ld+json">{"@type":"DefinedTerm","name":"思う"}</script>');
    });

    it('omits the JSON-LD script when structuredData is not provided', () => {
        const html = renderDocument(base);
        expect(html).not.toContain('application/ld+json');
    });

    it('embeds the body HTML verbatim', () => {
        const html = renderDocument(base);
        expect(html).toContain('<main>hello</main>');
    });
});

describe('extraScriptHref', () => {
    const base = {
        title: 'Grammar',
        description: 'Grammar points',
        canonicalPath: '/dictionary/grammar/',
        bodyHtml: '<main>x</main>',
        stylesheetHref: '/assets/styles.css',
    };

    it('links a second module script alongside the first', () => {
        // The grammar index is the only page with two scripts: the shared search box plus its
        // own interactive browser. A regression here silently ships a static-only page.
        const html = renderDocument({ ...base, scriptHref: '/a.js', extraScriptHref: '/b.js' });
        expect(html).toContain('<script type="module" src="/a.js"></script>');
        expect(html).toContain('<script type="module" src="/b.js"></script>');
    });

    it('omits it when not provided', () => {
        const html = renderDocument({ ...base, scriptHref: '/a.js' });
        expect(html).toContain('src="/a.js"');
        expect(html.match(/<script type="module"/g)).toHaveLength(1);
    });
});
