import { describe, it, expect } from 'vitest';
import { buildSitemapXml, buildRobotsTxt } from './sitemap';

describe('buildSitemapXml', () => {
    it('wraps each path in a <url><loc> entry resolved to an absolute URL', () => {
        const xml = buildSitemapXml(['/', '/vocab/1589350/']);
        expect(xml).toContain('<loc>https://dictionary.gokan.dev/</loc>');
        expect(xml).toContain('<loc>https://dictionary.gokan.dev/vocab/1589350/</loc>');
    });

    it('preserves percent-encoded segments without double-encoding', () => {
        const xml = buildSitemapXml(['/kanji/%E6%80%9D/']);
        expect(xml).toContain('<loc>https://dictionary.gokan.dev/kanji/%E6%80%9D/</loc>');
    });

    it('produces a valid urlset root element', () => {
        const xml = buildSitemapXml(['/']);
        expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xml.trim().endsWith('</urlset>')).toBe(true);
    });
});

describe('buildRobotsTxt', () => {
    it('allows all crawlers and points at the sitemap', () => {
        const robots = buildRobotsTxt();
        expect(robots).toContain('User-agent: *');
        expect(robots).toContain('Allow: /');
        expect(robots).toContain('Sitemap: https://dictionary.gokan.dev/sitemap.xml');
    });
});
