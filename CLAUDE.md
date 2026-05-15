# CLAUDE Project Context

> [!IMPORTANT]
> **This file is a redirect.** The full documentation has been distributed into a tree of `AGENT.md` files
> to keep each file focused and within token limits.
>
> **⚠️ CRITICAL REQUIREMENT: ALWAYS UPDATE BOTH CLAUDE.md AND GEMINI.md ⚠️**
> When you modify either file, immediately update the other with identical changes.
> Both files must always contain the same information.

## Start Here

Read [`AGENT.md`](AGENT.md) first — it covers the monorepo overview, structure, and modification log.

## AGENT.md Hierarchy

| Path | Covers |
|---|---|
| [`AGENT.md`](AGENT.md) | Monorepo overview, packages, build commands, modification log |
| [`packages/core/AGENT.md`](packages/core/AGENT.md) | Platform-agnostic business logic: models, SRS service, vocabulary service, storage/fetch adapters |
| [`packages/app/AGENT.md`](packages/app/AGENT.md) | Shared React Native UI: components, pages, QuizContext, NavigationContext, learning queue logic |
| [`packages/ui/AGENT.md`](packages/ui/AGENT.md) | Design system: THEME tokens, StyleSheet utilities, typography |
| [`apps/web/AGENT.md`](apps/web/AGENT.md) | Vite + React web app: config, routing, web adapters, deployment |
| [`apps/mobile/AGENT.md`](apps/mobile/AGENT.md) | Expo mobile app: Expo Router, MMKV, native fetch, Google Sign-In, build |

## Quick Reference

**Project**: Gokan SRS (語感) — Japanese vocabulary SRS app, cross-platform (web + Android/iOS).
**Monorepo**: Bun + Turborepo. Three shared packages (`core`, `app`, `ui`) + two apps (`web`, `mobile`).
**Key principle**: `@gokan-srs/core` has zero React dependency. Platform differences are bridged via `StorageAdapter` and `FetchAdapter` interfaces.
**Design**: Calm, precise study instrument. Not a game. See [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
