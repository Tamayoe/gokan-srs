# gokan-dictionary

SEO-crawlable static dictionary pages for kanji, vocabulary, and (eventually) grammar — a public-facing companion to the [gokan-srs](../gokan-srs) learning app, for visitors who just want to look something up without going through SRS setup.

Built with Svelte + Vite, using build-time pre-rendering rather than a full SSR framework, kept deliberately lightweight and static. Consumes the compiled dataset from [gokan-dataset](https://github.com/gokan-dev/gokan-dataset).

Currently a placeholder skeleton — see [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19) for the full scope.

## Running locally

```bash
bun install
bun run --cwd apps/gokan-dictionary dev
```
