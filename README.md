# 語感 — Gokan

Monorepo for the Gokan Japanese-learning ecosystem.

## Apps

- **[apps/gokan-srs](apps/gokan-srs)** — the SRS-driven vocabulary/kanji learning app. See its own [README](apps/gokan-srs/README.md) for details on the algorithm, data pipeline, and stack.
- **[apps/gokan-dictionary](apps/gokan-dictionary)** — SEO-crawlable static dictionary pages (kanji/vocab/grammar), built with Svelte + Vite. Currently a placeholder skeleton (see [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19)).

## Related repos

- [gokan-dataset](https://github.com/gokan-dev/gokan-dataset) — the open, CC BY-SA-licensed vocabulary/kanji/sentence dataset both apps above consume. Not owned by this repo - `apps/gokan-srs` pulls it in as a git submodule (`apps/gokan-srs/dataset/`).

## Development

This repo uses [Bun workspaces](https://bun.sh/docs/install/workspaces). On a fresh clone, initialize the dataset submodule first:

```bash
git submodule update --init --recursive
bun install        # installs deps for every app
bun run dev         # runs apps/gokan-srs in dev mode (syncs the dataset from the submodule first)
bun run dictionary:dev  # runs apps/gokan-dictionary in dev mode
bun run test         # runs apps/gokan-srs's test suite
```

To rebuild the dataset itself from raw sources (not needed for normal `dev`/`build`), the submodule needs its own one-time install first, since it's outside the root workspace:

```bash
bun install --cwd apps/gokan-srs/dataset
bun run dataset:build
```

Or scope any command to a single app with `--cwd`:

```bash
bun run --cwd apps/gokan-srs typecheck
```

See [CLAUDE.md](CLAUDE.md) for full architecture documentation.
