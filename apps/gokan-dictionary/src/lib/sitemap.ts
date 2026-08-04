// Pure sitemap.xml / robots.txt builders. ~39k URLs total (vocab + kanji + home) fits
// comfortably under the 50,000-URL single-sitemap limit, so there's no need for a sitemap
// index file here.

import { absoluteUrl } from './urls';

export function buildSitemapXml(paths: string[]): string {
    const urls = paths
        .map(path => `  <url><loc>${absoluteUrl(path)}</loc></url>`)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRobotsTxt(): string {
    return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
}
