# gokan-dictionary

SEO-crawlable static dictionary pages for kanji and vocabulary (grammar entries are future work) — a public-facing companion to the [gokan-srs](../gokan-srs) learning app, for visitors who just want to look something up without going through SRS setup.

Built with Svelte + Vite, using build-time pre-rendering rather than a full SSR framework, kept deliberately lightweight and static. Consumes the compiled dataset from [gokan-dataset](https://github.com/gokan-dev/gokan-dataset). Every page (~35,800 vocab + ~2,300 kanji) is a static `index.html` written by `scripts/prerender.ts` — no server runtime, no client-side router. See [CLAUDE.md](../../CLAUDE.md#gokan-dictionary-app) for the full architecture.

## Running locally

```bash
bun install
bun run --cwd apps/gokan-dictionary dev       # dev server (placeholder shell only, see below)
bun run --cwd apps/gokan-dictionary build      # vite build + prerender -> dist/
bun run --cwd apps/gokan-dictionary preview    # serve dist/ locally
bun run --cwd apps/gokan-dictionary test       # vitest
bun run --cwd apps/gokan-dictionary typecheck  # svelte-check
```

`vite dev` serves `App.svelte`, a placeholder explaining the static-generation model — there's no client-side SPA in production. To see the real generated pages, run `build` then `preview`.
