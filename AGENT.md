# Gokan SRS — Root Agent Context

> [!IMPORTANT]
> **This is the primary AI context file for the monorepo root.**
> For deeper context, read the `AGENT.md` file in the relevant sub-directory before making changes.
>
> **⚠️ Keep `CLAUDE.md`, `GEMINI.md`, and this file in sync. ⚠️**
> All three must carry the same redirects and summary. Update all of them together.

## AGENT.md Hierarchy

| Path | Covers |
|---|---|
| `AGENT.md` (this file) | Monorepo overview, packages, build/dev commands, modification log |
| [`packages/core/AGENT.md`](packages/core/AGENT.md) | Models, SRS service, vocabulary service, storage/fetch adapters |
| [`packages/app/AGENT.md`](packages/app/AGENT.md) | Shared React/RN components, contexts (QuizContext, Navigation…), pages |
| [`packages/ui/AGENT.md`](packages/ui/AGENT.md) | Design system — `THEME` tokens, `styles` StyleSheet, typography |
| [`apps/web/AGENT.md`](apps/web/AGENT.md) | Vite config, react-router-dom routing, web-specific wiring |
| [`apps/mobile/AGENT.md`](apps/mobile/AGENT.md) | Expo Router, MMKV, native fetch, Google Sign-In native, build |

---

## Project Overview

**Gokan SRS** (語感 — "sense of language") is a Japanese vocabulary learning app using a custom Spaced Repetition System. It is designed as a **serious study instrument**, not a gamified app.

### Goals
- **Vocabulary Acquisition**: Teach Japanese vocabulary based on the user's kanji knowledge
- **Spaced Repetition**: Optimize review timing using a custom SRS algorithm
- **Kanji-Aware Learning**: Only introduce vocabulary containing kanji the user already knows
- **Google Drive Sync**: Persist progress across devices
- **Cross-Platform**: Single shared codebase for web and Android/iOS via Expo

---

## Monorepo Architecture

The project is a **Bun + Turborepo monorepo** with two apps and three shared packages.

```
gokan-srs/                          # Monorepo root
├── apps/
│   ├── web/                        # @gokan-srs/web   — Vite + React + react-native-web
│   └── mobile/                     # @gokan-srs/mobile — Expo (expo-router)
├── packages/
│   ├── core/                       # @gokan-srs/core  — Platform-agnostic business logic
│   ├── app/                        # @gokan-srs/app   — Shared React Native UI & state
│   └── ui/                         # @gokan-srs/ui    — Design tokens & StyleSheet helpers
├── data/                           # Compiled JSON vocabulary data
│   └── compiled/
│       ├── index/                  # kklc.json, kklc-kanji.json, frequency.json, search.json
│       ├── vocab/                  # {id}.json — one file per vocabulary item
│       └── sentences/              # {vocabId}.json — example sentences
├── scripts/                        # Data build scripts (run at root)
│   ├── build-kanji.ts
│   ├── build-data.ts               # Main pipeline: vocab + sentences + indexes
│   └── jpdb-v2.2-tsv-to-json.js
├── tests/                          # Root-level integration/data-integrity tests
├── AGENT.md                        # This file
├── CLAUDE.md                       # Thin redirect → AGENT.md tree
├── GEMINI.md                       # Thin redirect → AGENT.md tree
├── DESIGN_SYSTEM.md                # Visual design guidelines
├── turbo.json                      # Turborepo task pipeline
└── package.json                    # Root workspace (bun workspaces)
```

### Package Dependency Graph

```
apps/web  ─────────────────────────────┐
apps/mobile  ──────────────────────────┤──▶  @gokan-srs/app  ──▶  @gokan-srs/core
                                       │                      ──▶  @gokan-srs/ui ──▶ @gokan-srs/core
                                       └──▶  @gokan-srs/core
                                       └──▶  @gokan-srs/ui
```

`@gokan-srs/core` has **no React dependency** — pure TypeScript business logic, platform-agnostic via injected adapters.

---

## Tech Stack

| Concern | Web (`apps/web`) | Mobile (`apps/mobile`) | Shared |
|---|---|---|---|
| Framework | React 19 + Vite | React 19 + Expo ~55 | — |
| Language | TypeScript | TypeScript | TypeScript |
| Styling | Tailwind CSS v4 + `react-native-web` StyleSheet | React Native StyleSheet | `@gokan-srs/ui` tokens |
| Routing | `react-router-dom` v7 | `expo-router` v3 (file-based) | `NavigationContext` abstraction |
| Storage | `localStorage` | `react-native-mmkv` | `StorageAdapter` interface |
| Data fetch | Browser `fetch` | `expo-file-system` (bundled assets) | `FetchAdapter` interface |
| Google Auth | `@react-oauth/google` | `@react-native-google-signin/google-signin` | `GoogleDriveSync` (core) |
| Icons | `@expo/vector-icons` (via react-native-web) | `@expo/vector-icons` | — |
| Animations | `framer-motion` (web only) | React Native Animated / Reanimated | — |
| Monorepo | Turborepo | Turborepo | Bun workspaces |

---

## Build & Development Commands

All commands run from the **monorepo root** unless noted.

### Development
```bash
bun run dev            # Start web dev server (Vite, filter=@gokan-srs/web)
bun run typecheck      # Typecheck all packages via Turborepo
bun run lint           # Lint all packages via Turborepo
bun test               # Run all tests (Vitest)
```

### Mobile (run from apps/mobile)
```bash
bun run start          # Expo dev server
bun run android        # Run on Android device/emulator
bun run ios            # Run on iOS simulator
bun run build:android  # expo prebuild → copy assets → gradlew assembleRelease
```

### Production Web Build
```bash
bun run build          # Turborepo build (all packages)
# Web output: apps/web/dist/
```

### Data Compilation (run from root)
```bash
bun run build:data     # Full pipeline: kanji + vocab + sentences + indexes
bun run build:kanji    # Compile KKLC kanji index only
bun run build:jpdb     # Convert JPDB TSV to JSON
```

### Data Build Scripts

**`scripts/build-kanji.ts`**
- Reads KKLC dataset
- Generates `data/compiled/index/kklc-kanji.json`

**`scripts/build-data.ts`** (main pipeline, replaces old `build-vocabulary.ts` + `build-sentences.ts`)
- Reads JMDict, JPDB frequency data, sentence pairs (TSV), reading indices (CSV)
- Uses `SentenceTokenizer` (Kuromoji-based) for morphologically accurate sentence-vocab linking
- Coverage filtering: discards sentences where matched vocab covers <50% of text length
- Merges homograph JMDict duplicates into unified entries (outputs `merged-map.json`)
- Generates:
  - `data/compiled/vocab/{id}.json`
  - `data/compiled/index/kklc.json`, `index/frequency.json`, `index/search.json`
  - `data/compiled/sentences/{vocabId}.json`

**Data Sources:**
- KKLC: https://github.com/ppasupat/vocab-kanji
- JMDict: Japanese-English dictionary
- JPDB: https://jpdb.io frequency data
- Tatoeba: Japanese-English sentence pairs

---

## Test Infrastructure

**Framework**: Vitest (run via Bun)

**Test locations:**
- `packages/core/` — SRS algorithm, migration service unit tests
- `scripts/` — Data integrity (vocab/index file validation), Kuromoji tokenizer tests
- `tests/` — Root integration tests

**CI/CD** (`.github/workflows/deploy.yml`):
- Tests run automatically on push to `main`
- Deployment proceeds only if all tests pass
- CloudFront cache invalidation covers `/data/compiled/*` to prevent stale data

---

## Cross-Platform Code Sharing Policy

> [!IMPORTANT]
> **Always maximise shared code between web and mobile.**
> Implement platform-specific code **only when there is no shared alternative**, and **always ask the user first** before doing so.
>
> Platform-specific files (`.native.tsx`, `.web.tsx`, or anything inside `apps/web/` or `apps/mobile/`) should be thin wrappers or adapter bridges — the actual logic and UI belong in `packages/app/` or `packages/core/`.
>
> **Shared gate pattern**: `AppGate` (`packages/app/src/components/AppGate.tsx`) handles the Google Drive sync loader and the first-launch onboarding check for both platforms. Any new app-level guard (auth, feature flags, etc.) belongs there, not in each platform's root layout.

---

## Error Handling Policy

**Fatal Errors**: If a vocabulary file fails to load, the app must **suspend operation** with a visible error screen. Silent skipping is not permitted — it masks data corruption.

**Error Display**: The root app component (`App.tsx` on web, `_layout.tsx` on mobile) checks `state.fatalError` and renders a full-screen error with a reload/restart button.

---

## Modification Log

> [!IMPORTANT]
> **Update this log when making functional changes.**
> Document the *result* of investigations and the *reasoning* behind system behavior changes.

- **[2026-06-07]**:
  - **Mobile bundling fixes**:
    - Added `apps/mobile/metro.config.js` with `watchFolders`, `nodeModulesPaths`, `unstable_enablePackageExports: false`, and `extraNodeModules` mapping `@gokan-srs/*` packages to their `src/` directories, fixing Metro's inability to resolve the wildcard `"./*": "./src/*"` package exports without file extensions.
    - Updated `mmkv.adapter.ts` to use `createMMKV()` (react-native-mmkv v4 API) instead of the removed `new MMKV()`.
    - Wired `StorageService.configure(mmkvStorageAdapter)` in `_layout.tsx` — it was defined but never called.
    - Fixed `GoogleSignin` v16 API: replaced `isSignedIn()` (removed) with synchronous `hasPreviousSignIn()`; updated `signIn()` and `signInSilently()` result access from `.user.*` to `.data.user.*`.
    - Fixed `ResponsiveProvider` to use React Native `Dimensions` API instead of `window.innerWidth/addEventListener` (browser-only APIs that crash on native).
    - Created shared `AppGate` component (`packages/app/src/components/AppGate.tsx`) used by both platforms for the Google Drive sync loader and first-launch onboarding gate. Mobile `_layout.tsx` now wraps `<Stack>` with `<AppGate>` — previously the mobile app went straight to `QuizScreen` on first launch, showing the "All caught up" screen instead of onboarding.

- **[2026-05-25]**:
  - **React Native Web & Mobile Migration Fixes**:
    - **Theme System & Dark Mode**: Created platform-aware `THEME` in `@gokan-srs/ui` to map colors to CSS variables on Web and static light colors on Mobile, enabling dynamic dark mode on Web without changing component-level styling. Added safety guards around `localStorage` and `window` in `ThemeContext` to prevent crashes on native mobile. Updated text colors inside `MasteryRing` to be theme-aware.
    - **VocabCard Layout**: Restructured layout to place Kanji and mastery rings on the first row and readings underneath with `flexShrink: 1` to resolve word-wrapping and collision issues.
    - **SVG Loader Animations**: Optimized loader animations by rendering a GPU-accelerated HTML/CSS version on Web and utilizing `useNativeDriver: true` for layout scale/opacity animations on Mobile, resolving performance lag.
    - **VocabDetail Page Styling**: Fixed grey borders by replacing `styles.border` with `styles.borderTop` in specific views. Set dynamic text color for related compounds in `compoundList` to make them visible in light mode.
    - **Relationships Card Port**: Rewrote `VocabRelationshipsCard` from raw HTML/Tailwind to React Native primitives (`View`, `Text`, `Pressable`, `Button`, `Card`), making it compatible with both Web and Mobile platforms.
    - **Input Focus Outline Dark Mode Fix**: All `TextInput` elements (`BaseQuizCard`, `SmartVocabList`, `Settings`) had the browser's default white focus ring suppressed with `outlineStyle: 'none'` (React Native Web property). The quiz input now also dynamically changes its `borderColor` to `THEME.colors.accent` when focused (instead of showing the default browser ring), matching the production design.

- **[2026-05-22]**:
  - **TypeScript Configuration & Build Fixes**:
    - **React Native Imports**: Resolved resolution errors where `react-native` imports in shared packages and web apps resolved to un-typed JS source code of `react-native-web/src/index` by removing the incorrect `react-native` path alias from `packages/ui/tsconfig.json`, `packages/app/tsconfig.json`, and `apps/web/tsconfig.app.json`. TS now correctly resolves to standard React Native types from `node_modules/react-native/index.d.ts` during typechecking.
    - **FormData Upload Body**: Cast `FormData` upload body to `any` in `google.service.ts` to bypass typecheck mismatch errors in environment-agnostic core libraries.
    - **Loader Styles**: Fixed inline style type error in `Loader.tsx` by replacing non-existent `styles.gap10` with inline `{ gap: 40 }`.
    - **Settings Screen Types & Typo**: Fixed implicit `any` parameter types and trailing syntax typo `</View>e)` in `Settings.tsx`.
    - **Daily Progression Chart**: Removed unused `total` variable declaration in `DailyProgressionChart.tsx`.

- **[2026-05-18]**:
  - **Web UI Regression Fixes & Animation Porting**:
    - **Daily Progression Chart**: Rewrote `DailyProgressionChart.tsx` completely from Tailwind/HTML into React Native View/Text with native-safe flexbox styles to fix layout collapse.
    - **Vocab List Heights**: Modified `SmartVocabList.tsx` to style wrapper components with `display: 'flex'` and added proper layout matching to keep vocabulary cards at uniform heights.
    - **Vocab details Border**: Fixed the "Original Entries" merged cards border issue in `VocabDetailScreen.tsx` by removing the global border styling and replacing it with a neat custom left-accent border.
    - **Sentences Card Feature Restoration**: Reimplemented the sentence slice/expansion logic in `VocabSentencesCard.tsx` with a beautifully styled "Show all" / "Show less" toggle using the shared `Button` primitive.
    - **Breathing Seal Loader Porting**: Fully recreated the original high-fidelity "Breathing Seal" SVG animation in `Loader.tsx` using React Native's `Animated` library (ripple effects, heartbeat scaling, and color breathing), and updated `LoadingScreen.tsx` to use this new beautiful custom loader.

- **[2026-05-15]**:
  - **Expo Monorepo Migration**: Refactored from a single Vite-only React webapp into a Bun + Turborepo monorepo.
    - Created `packages/core` (`@gokan-srs/core`): all platform-agnostic business logic (models, services, SRS algorithm, utils, constants, theme). No React dependency.
    - Created `packages/app` (`@gokan-srs/app`): all shared React Native UI — components, pages, contexts (QuizContext, GoogleDriveContext, ThemeContext, NavigationContext, KanjiForm, Responsive).
    - Created `packages/ui` (`@gokan-srs/ui`): design tokens (`THEME`) and `StyleSheet`-based utility helpers (`styles`).
    - `apps/web` remains Vite-based but now imports from workspace packages. Uses `react-native-web` to render RN components. `vite.config.ts` has a `workspace-resolver` plugin to resolve `@gokan-srs/*` imports and a `react-native-web-fixes` plugin to redirect `react-native` imports.
    - `apps/mobile` is a new Expo app using `expo-router` for file-based routing. Routes mirror the web routes (`/`, `/stats`, `/profile`, `/settings`, `/about`, `/vocab/[id]`).
    - Introduced platform adapter pattern: `StorageAdapter` and `FetchAdapter` interfaces in `packages/core/src/adapters/`. Web uses `localStorage` + browser `fetch`; mobile uses `react-native-mmkv` + `expo-file-system`.
    - `GoogleDriveContext` is split: the context shape/hook lives in `packages/app`; the provider implementation is platform-specific (`apps/web` uses `@react-oauth/google`, `apps/mobile` uses `@react-native-google-signin/google-signin`).
    - `NavigationContext` in `packages/app` abstracts routing. Web provides it via `react-router-dom`; mobile provides it via `expo-router`'s `useRouter`.
    - Replaced `GEMINI.md`/`CLAUDE.md` monolithic docs with a distributed `AGENT.md` tree for scalability.
    - Added `DESIGN_SYSTEM.md` as dedicated visual design reference.

- **[2026-04-10]**: Added "Kanji Coverage" statistic to `StatsOverview`.

- **[2026-03-27]**:
  - **Configurable Context Quiz Threshold**: Added `meaningContextThreshold` (`'early' | 'normal' | 'late'`) to `UserSettings`. Replaced hardcoded 30% with `meaningContextThresholds` map (`early: 30, normal: 50, late: 70`). Default changed from 30% to 50%.

- **[2026-03-20]**: Introduced frequency penalty to Kanji Coverage scoring: `Score = (Coverage * 2500) - Frequency Rank`.

- **[2026-03-18]**: New `kanji_coverage` learning order based on Set Cover problem. Added `kanjiCoverageTarget` to `UserSettings`.

- **[2026-03-11]**:
  - **Meaning Quiz Mode Split**: Introduced `QuizMode` (`'base' | 'context'`). Base = strict dict eval; Context = sentence + AI eval. Added `alwaysUseAiForMeaningContext` setting.

- **[2026-03-10]**: Alternative vocabulary writings: captured and retained JMDict alt kanji forms; updated sentence tokenizer indexing and `VocabDetailScreen`.

- **[2026-03-06]**: `learningFrequency` setting (`high/medium/low`) → scales SRS interval via `frequencyModifier` (1.0/1.5/2.0).

- **[2026-03-05]**: Sentence tokenizer overlap fix — strict overlap check + length tie-breaker.

- **[2026-03-03]**: Vocabulary parent relationships (`parents[]`); multiple sentence occurrences support; unified `build-data.ts` pipeline.

- **[2026-02-28]**: Vocabulary dropping bug fix (fallback ranks for unknown kanji/JPDB entries); Kuromoji `SentenceTokenizer`; dataset grew to 36,795 vocab files; mobile CloudFront cache fix; AI `minor_error` support; Vocab history graph; Stats bucket fix; Session queue orchestration (`BUILD_SESSION_QUEUE` / `SHIFT_SESSION_QUEUE`).

- **[2026-02-22]**: Homograph vocabulary merge (V5 migration); `mergedVocabs` model field; `merged-map.json`.

- **[2026-02-21]**: Duplicate quizzes fix — meaning `dueDate` staggered +12h from reading `dueDate`.

- **[2026-02-17]**: Sync conflict resolution fix (local authoritative for KanjiKnowledge); race condition fix via optimistic versioning.

- **[2026-02-16]**: Meaning quiz implementation — `evaluateMeaning`, `InteractiveSentence`, `MeaningQuizCard`, `enableMeaningQuiz` setting.

- **[2026-02-15]**: Sentence data integration — `build-sentences.ts`, `Sentence`/`SentenceSet` models.

- **[2026-01-29]**: Data migration system — `mastery` (0-100) → `memoryStrength`/`interval`; `_formatVersion` tracking.

- **[2026-01-28]**: Test infrastructure (Vitest); immediate retry mechanism (`needsRetry`); stateless buffered introduction (batch size 3); centralized queue management in `QuizContext`.
