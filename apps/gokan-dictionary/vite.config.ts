import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'

// This app has no client-side router or SPA shell in production - `index.html`/App.svelte
// exist only for local `vite dev` iteration. The real pages are static HTML files written by
// scripts/prerender.ts (a standalone Bun script, not part of this Vite build - it compiles
// the page components server-side via svelte/compiler directly, see its header comment for
// why). This build's only production-relevant job is producing the two browser-facing assets
// prerender.ts links into every static page: the global stylesheet and the search script -
// both listed as extra rollup inputs so Vite content-hashes and manifests them like any other
// entry, instead of relying on them being pulled in transitively from index.html (which isn't
// used in the static output at all).
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    manifest: true,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        styles: fileURLToPath(new URL('./src/app.css', import.meta.url)),
        search: fileURLToPath(new URL('./src/client/search.ts', import.meta.url)),
      },
    },
  },
})
