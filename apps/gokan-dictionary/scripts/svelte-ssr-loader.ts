// Registers a Bun runtime plugin that compiles .svelte files to server-rendered JS on import,
// using svelte/compiler directly (generate: 'server') rather than going through Vite. This is
// what lets scripts/prerender.ts `await import('../src/pages/VocabPage.svelte')` and get back
// a real Svelte component it can pass to svelte/server's render() - see that script's header
// comment for why prerendering happens outside Vite's own build at all.
//
// Must be imported (for its side effect) before any .svelte import is evaluated - Bun runtime
// plugins only affect imports that happen after registration, so this needs to be a static
// top-of-file import in prerender.ts, with the .svelte imports themselves done via dynamic
// `import()` afterwards (a static import of a .svelte file at the top of prerender.ts would
// be hoisted and resolved before this plugin registration runs).

import { plugin } from 'bun';
import { compile } from 'svelte/compiler';
import fs from 'node:fs';

plugin({
    name: 'svelte-ssr-loader',
    setup(build) {
        build.onLoad({ filter: /\.svelte$/ }, (args) => {
            const source = fs.readFileSync(args.path, 'utf-8');
            const { js } = compile(source, { filename: args.path, generate: 'server' });
            return { contents: js.code, loader: 'js' };
        });
    },
});
