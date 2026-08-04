// Pure HTML-document builder. Svelte's server render() only produces a <body>-shaped
// fragment (see prototype notes in scripts/prerender.ts) - this wraps that fragment with the
// <head> (SEO meta, canonical link, JSON-LD, asset links) every static page needs. Kept as
// plain string templating rather than a Svelte component: a document shell (<html>/<head>)
// isn't itself a piece of UI, and templating it directly avoids a whole extra SSR call per
// page for something that's just string concatenation.

import { absoluteUrl } from './urls';

export interface DocumentShellOptions {
    title: string;
    description: string;
    /** Site-relative path, e.g. "/vocab/1589350/" - used for the canonical link and og:url. */
    canonicalPath: string;
    bodyHtml: string;
    /** Absolute href to the built global stylesheet (from the Vite client manifest). */
    stylesheetHref: string;
    /** Absolute href to the built search script - only set on the home page. */
    scriptHref?: string;
    /** Optional schema.org JSON-LD object, serialized verbatim into a <script type="application/ld+json">. */
    structuredData?: object;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderDocument(options: DocumentShellOptions): string {
    const canonical = absoluteUrl(options.canonicalPath);
    const title = escapeHtml(options.title);
    const description = escapeHtml(options.description);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary" />
<link rel="stylesheet" href="${options.stylesheetHref}" />
${options.scriptHref ? `<script type="module" src="${options.scriptHref}"></script>\n` : ''}${options.structuredData ? `<script type="application/ld+json">${JSON.stringify(options.structuredData)}</script>\n` : ''}</head>
<body>
${options.bodyHtml}
</body>
</html>
`;
}
