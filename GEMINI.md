# GEMINI Project Context

> [!IMPORTANT]
> **Keep this documentation updated.**
> This file serves as the long-term memory for AI agents working on Gokan SRS. When making functional changes, update the relevant sections to reflect the current state of the codebase.
>
> **⚠️ CRITICAL REQUIREMENT: ALWAYS UPDATE BOTH GEMINI.md AND CLAUDE.md ⚠️**
> 
> When you modify either GEMINI.md or CLAUDE.md, you MUST immediately update the other file with IDENTICAL changes.
> Both files must always contain the same information to ensure all AI agents have equivalent knowledge.
> 
> **WORKFLOW**: After editing one file, IMMEDIATELY edit the other before proceeding with any other work.

> [!IMPORTANT]
> **No em dashes.** The em dash character (—) is prohibited everywhere in this project: documentation, code, comments, commit messages, PR descriptions, workflow names, and any AI-generated output. Use a colon, parentheses, a comma, or a reworded sentence instead. This applies to every agent and every file, from now on.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Design System](#design-system)
3. [Project Structure](#project-structure)
4. [Core Data Models](#core-data-models)
5. [Services & Business Logic](#services--business-logic)
6. [State Management](#state-management)
7. [Application Pages](#application-pages)
8. [gokan-dictionary App](#gokan-dictionary-app)
9. [Build & Development](#build--development)
10. [Functional Workflows](#functional-workflows)
11. [Constants & Configuration](#constants--configuration)

---

## Project Overview

**Gokan SRS** (語感 - "sense of language") is a Japanese vocabulary learning application using Spaced Repetition System (SRS) algorithms. It's designed as a serious study instrument, not a gamified app.

This repo (`gokan-srs`) is a **monorepo** (Bun workspaces) hosting `apps/gokan-srs` (this app) and `apps/gokan-dictionary` (a companion SEO-crawlable static dictionary site - see [gokan-dictionary App](#gokan-dictionary-app) below and [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19)). Both live under the `gokan-dev` GitHub org, alongside the separate `gokan-dataset` repo (the open, CC BY-SA-licensed vocab/kanji/sentence dataset both apps consume). See the root [README.md](README.md) for the full ecosystem layout.

### Main Goals
- **Vocabulary Acquisition**: Teach Japanese vocabulary based on user's kanji knowledge
- **Spaced Repetition**: Optimize review timing using custom SRS algorithm
- **Kanji-Aware Learning**: Only introduce vocabulary containing kanji the user knows
- **Google Drive Sync**: Persist user progress across devices

### Tech Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite (rolldown-vite variant)
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + useReducer
- **Authentication**: Google OAuth (@react-oauth/google)
- **Icons**: Lucide React
- **Animations**: Framer Motion

---

## Design System

> [!IMPORTANT]
> **Adhere strictly to the design system.**
> Gokan SRS is a study instrument, not a game. The appearance must be calm, precise, and trustworthy.

Refer to [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for full details. It's a monorepo-wide doc — both `apps/gokan-srs` and `apps/gokan-dictionary` should follow it.

### Key Principles
- **Tone**: Neutral, Direct, Encouraging (no cheerleading)
- **Visuals**: Minimize colors. Use Primary Accent (Indigo #2E3A59) for focus. Use Secondary Accent (Muted Vermilion #8A3A2E) ONLY for errors/warnings
- **Typography**: Source Serif 4 + Inter for English, Noto Serif JP + Noto Sans JP for Japanese
- **Animations**: Minimal (150-200ms), no bounce, ease-in-out only

---

## Project Structure

Monorepo root, using Bun workspaces (`package.json`'s `workspaces: ["apps/*"]`). Everything that used to live at repo root (before the `[2026-07-26]` monorepo migration) now lives under `apps/gokan-srs/`, unchanged internally - only the path prefix changed.

The compiled dataset itself lives in the separate [`gokan-dataset`](https://github.com/gokan-dev/gokan-dataset) repo, consumed here as a **git submodule** at `apps/gokan-srs/dataset/` - see Build & Development → Dataset Consumption for how the pieces fit together.

```
gokan-srs/                          # monorepo root
├── apps/
│   ├── gokan-srs/                  # the SRS learning app - was the repo root pre-migration
│   │   ├── dataset/                   # git submodule -> gokan-dataset (raw sources, build pipeline, compiled/ output)
│   │   ├── public/                    # Static assets
│   │   │   └── data/compiled/         # NOT committed - synced from dataset/compiled/ at dev/build time
│   │   ├── scripts/
│   │   │   └── sync-dataset.ts       # Copies dataset/compiled/ -> public/data/compiled/
│   │   ├── src/
│   │   │   ├── assets/               # Images, fonts
│   │   │   ├── commons/              # Shared constants
│   │   │   │   └── constants.ts      # App-wide configuration
│   │   │   ├── components/           # Reusable UI components
│   │   │   ├── context/              # React Context providers
│   │   │   │   ├── quiz/             # Quiz state machine (modular, see State Management)
│   │   │   │   │   ├── quizReducer.ts          # Pure reducer (state + actions, no I/O)
│   │   │   │   │   ├── quizSelectors.ts        # selectNextView + derived selectors
│   │   │   │   │   ├── useQuizOrchestration.ts # All effects + actions (I/O, sync, timers)
│   │   │   │   │   └── QuizProvider.tsx        # Thin assembler exposing QuizContextValue
│   │   │   │   ├── useQuiz.ts        # useQuiz() hook + QuizContext object
│   │   │   │   ├── GoogleDriveContext.tsx
│   │   │   │   ├── ThemeContext.tsx
│   │   │   │   ├── KanjiForm/        # Kanji knowledge form state
│   │   │   │   └── Responsive/       # Responsive utilities
│   │   │   ├── models/               # TypeScript interfaces
│   │   │   │   ├── vocabulary.model.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   ├── data.model.ts     # External dataset DTOs
│   │   │   │   ├── index.model.ts
│   │   │   │   ├── state.model.ts
│   │   │   │   └── kanji.model.ts
│   │   │   ├── pages/                # Page components
│   │   │   │   ├── main/             # Activity hub (landing route '/') - activity cards + session recap
│   │   │   │   ├── quiz/             # Study session screen, route '/quiz' (also hosts quizFormatting.ts helpers)
│   │   │   │   ├── setup/            # Initial setup wizard
│   │   │   │   ├── settings/         # App settings
│   │   │   │   ├── profile/          # User profile
│   │   │   │   ├── stats/            # Statistics screen + charts (see Application Pages)
│   │   │   │   └── about/            # About page
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── srs.service.ts    # SRS algorithm (formula only)
│   │   │   │   ├── scheduling.ts     # Single source of truth for due-date/mastery derivation
│   │   │   │   ├── vocabulary.service.ts
│   │   │   │   ├── storage.service.ts
│   │   │   │   ├── backup.service.ts        # Write-once pre-migration safety snapshots
│   │   │   │   ├── progressSerialization.ts # Shared (de)serialization for storage + Drive
│   │   │   │   ├── migration.service.ts
│   │   │   │   ├── sync/                    # Google Drive sync (see Services & Business Logic)
│   │   │   │   │   ├── driveClient.ts       # Raw Drive REST HTTP calls
│   │   │   │   │   ├── mergeProgress.ts     # Pure per-entry merge logic
│   │   │   │   │   ├── googleDriveSync.ts   # Orchestrator: CAS retry, dedup, backups
│   │   │   │   │   └── types.ts
│   │   │   │   └── quiz.service.ts
│   │   │   ├── utils/                # Helper functions
│   │   │   │   ├── srs.utils.ts
│   │   │   │   ├── knowledge.utils.ts # Knowledge-points model + cumulative curve builder
│   │   │   │   └── quiz.utils.ts
│   │   │   ├── App.tsx               # Root component with routing
│   │   │   ├── main.tsx              # Entry point
│   │   │   └── index.css             # Global styles
│   │   ├── terraform/                 # AWS infra (S3 + CloudFront) - specific to this app's hosting
│   │   ├── docs/                       # gokan-srs-specific docs
│   │   │   ├── ARCHITECTURE_AUDIT.md  # Architecture audit + remediation summary
│   │   │   ├── FUTURE_REFACTORS.md    # Deeper structural follow-ups, not yet scheduled
│   │   │   └── srs-*.txt              # SRS formula research notes
│   │   ├── package.json                # App-specific deps/scripts (react, vite, vitest, ...)
│   │   ├── vite.config.ts, tsconfig*.json, eslint.config.js, index.html
│   │   └── README.md
│   └── gokan-dictionary/            # SEO-crawlable static dictionary pages (kanji/vocab) - see "gokan-dictionary App" below
│       ├── src/
│       │   ├── pages/                  # HomePage/VocabPage/KanjiPage.svelte + SiteHeader/SiteFooter (no <style> blocks - see app.css)
│       │   ├── lib/                    # site.ts, urls.ts, seo.ts, documentShell.ts, vocabSummary.ts, sitemap.ts, dataset.server.ts, types.ts
│       │   ├── client/                 # search.ts - the only client-side JS on the whole site (progressive-enhancement search box)
│       │   ├── models/                 # 2nd copy of the shared model files (see Core Data Models)
│       │   ├── app.css                 # single global stylesheet for all pages
│       │   └── App.svelte, main.ts     # `vite dev`-only placeholder shell, unused in production
│       ├── scripts/
│       │   ├── prerender.ts            # static site generator - writes every dist/vocab, dist/kanji page
│       │   └── svelte-ssr-loader.ts    # Bun runtime plugin compiling .svelte for prerender.ts (see below)
│       ├── package.json
│       └── README.md
├── docs/                            # Ecosystem-wide docs (not specific to one app)
│   ├── DESIGN_SYSTEM.md            # Visual design guidelines - both apps should follow it
│   └── FUTURE_FEATURES.md          # Roadmap spanning gokan-srs, gokan-dictionary, gokan-dataset
├── .github/workflows/
│   ├── deploy.yml                   # Test + deploy gokan-srs, path-filtered to apps/gokan-srs/**
│   └── ci-gokan-dictionary.yml      # Typecheck + build gokan-dictionary, path-filtered
├── package.json                      # Workspace root manifest (Bun workspaces: "apps/*")
├── bun.lock                          # Single lockfile for the whole workspace
├── README.md                         # Monorepo overview, links to each app
├── CLAUDE.md                         # This file
└── GEMINI.md
```

`gokan-dataset` (the open dataset) and the org they all live under (`gokan-dev`) are separate repos, not part of this monorepo.

**Note**: every other file-path reference in this document (Core Data Models, Services & Business Logic, State Management, Application Pages, Test Infrastructure, etc.) is relative to `apps/gokan-srs/` unless stated otherwise - they predate the monorepo split and were not individually re-prefixed.

---

## Core Data Models

### Vocabulary (`vocabulary.model.ts`)

**`Vocabulary`** - Represents a Japanese word/phrase
- `id`: JMdict word ID (stable identifier)
- `writtenForm`: Kanji form + contained kanji characters
- `reading`: Primary reading + alternatives
- `frequency`: Kanji rank + optional kana rank
- `jlptLevel`: optional JLPT level (1=N1 hardest ... 5=N5 easiest). Descriptive/display-only - not used for learning order. Populated at build time by matching JMDict's written form against the [Bluskyo/JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary) dataset; most vocab won't have one (that dataset covers a few thousand words out of JMDict's ~40k+).
- `progression.kklcStep`: KKLC step requirement
- `components[]`: IDs of other vocabularies contained within this one
- `senses[]`: Array of meanings with POS, glosses, misc tags
- `usageHints`: Optional context hints

### Kanji (`kanji.model.ts`)

**`Kanji`** - A single kanji character and its known step/frequency numbers across different systems
- `character`: The kanji glyph itself
- `steps.kklc`: KKLC step number (this app's primary kanji-learning order)
- `steps.jlpt`: optional JLPT level (1=N1 hardest ... 5=N5 easiest), from the same JLPT dataset as vocab. Only ever set for kanji already in the KKLC-derived kanji set (build-kanji.ts's outer loop iterates KKLC chapters, not the JLPT file) - doesn't expand kanji coverage.
- `steps.frequency`: optional JPDB kanji frequency rank (currently unused, reserved)
- `frequency`: JPDB kanji frequency rank

**`VocabProgress`** - User's learning progress for a vocabulary item
- `vocabId`: Reference to Vocabulary.id
- `stage`: `'learning'` | `'graduated'`
- `introductionAt`: When user first saw this vocab
- `nextReviewAt`: Next scheduled review (null = new item)
- `lastReviewedAt`: Last review timestamp
- `totalReviews`: Total number of reviews
- `consecutiveFailures`: Consecutive wrong answers
- `reading`: SRSEntry for reading reviews
- `meaning`: SRSEntry for meaning reviews
- `needsRetry`: optional `{ reading?: boolean; meaning?: boolean }` - per-quiz-type immediate-retry flag. A wrong reading answer only forces a reading retry and never blocks a due meaning review (and vice versa).
- `nextReviewAt` is always **derived**, never hand-set independently - see `scheduling.ts` in Services & Business Logic.

**`SRSEntry`** - Detailed SRS state for reading/meaning
- `memoryStrength`: Current memory strength (days)
- `interval`: Current interval (days)
- `difficulty`: 0.0 (hard) to 1.0 (easy), default 0.3
- `dueDate`: When next review is due
- `history[]`: Array of ReviewLog entries

### Sentence Models (`sentence.model.ts`)

**`Sentence`**
- `id`: Original Japanese sentence ID (from source)
- `original`: Japanese sentence text
- `en`: Array of English translations (id + text)
- `indices`: Reading hints/furigana string (optional)

**`SentenceSet`**
- `vocabId`: Reference to Vocabulary.id
- `sentences`: Array of associated Sentence objects


### User Models (`user.model.ts`)

**`UserProgress`**
- `kanjiKnowledge`: KanjiKnowledge object
- `learningQueue`: Array of VocabProgress (all vocab ever introduced)
- `stats`: Counters for newLearnedToday, totalLearned, totalReviews
- `dailyOverride`: Allow bypassing daily new vocab limit

**`KanjiKnowledge`**
- `method`: `'kklc'` | `'rtk'` | `'jlpt'` | `'custom'`
- `step`: Current step (e.g., KKLC step 500)
- `kanjiSet`: Set<string> of known kanji characters

**`UserSettings`**
- `preferredLearningOrder`: `'kanji_coverage'` | `'frequency'` | `'kklc'` | `'jlpt'` (`'jlpt'` walks N5→N1, frequency-ordered within a level; kanji-filtered by default like every other order - see Services & Business Logic)
- `kanjiCoverageTarget`: 1 to 5 (how many words to learn per known kanji before prioritizing new words, default 1)
- `learningFrequency`: `'high'` | `'medium'` | `'low'`
- `enableMeaningQuiz`: boolean (default true)
- `geminiApiKey`: optional Gemini API key for AI context validation
- `enableGeminiContext`: boolean (default false)
- `alwaysUseAiForMeaningContext`: boolean (default true)
- `meaningContextThreshold`: `'early'` | `'normal'` | `'late'` (default `'normal'`). Controls the mastery % at which meaning quizzes switch to sentence/context mode (early=30%, normal=50%, late=70%).
- `ignoreKnownKanjiRequirement`: optional boolean (default false). When true, drops the "all contained kanji must already be known" filter for the `frequency`/`kanji_coverage`/`jlpt` orders. Has no effect on `kklc` (gated by step, not by kanji set). Settings UI surfaces it for every order except `kklc`.

### Session State (`state.model.ts`)

**`SessionState`** - Current quiz session state
- `'review'`: Due reviews exist
- `'learn'`: Can add new words
- `'waiting'`: Waiting for next review
- `'exhausted'`: No vocab left at all

---

## Services & Business Logic

### SRS Service (`srs.service.ts`)

Core SRS algorithm implementation. **This is the heart of the learning system.**

#### Key Methods

**`evaluateMeaning(userInput, meanings)`**
- Checks user input against English meanings/glosses
- Normalizes input (lowercase, strip punctuation, strip articles "to/a/an/the")
- Uses fuzzy matching (Levenshtein) and handles synonyms


**`evaluateAnswer(userInput, readings)`**
- Checks user input against all acceptable readings
- Returns best result: `'correct'` > `'minor_error'` > `'wrong'`
- Uses Levenshtein distance for typo detection

**`applyAnswer(vocab, userAnswer, correctAnswer, latencyMs, now, forcedResult?)`**
- Updates VocabProgress based on answer result
- Calculates new memory strength and interval
- Returns updated progress + result + interval

**`calculateNextState(entry, result, latencyMs, now)`**
- Core SRS formula implementation
- Adjusts memory strength based on:
  - Answer result (correct/minor_error/wrong/pass)
  - Response latency (faster = easier)
  - Current difficulty
- Returns new SRSEntry + interval

**`refillQueue(currentQueue, kanjiKnowledge, settings, maxToAdd, ignoredIds)`**
- Adds new vocabulary to learning queue
- Respects kanji knowledge constraints
- Uses either KKLC or frequency ordering
- Returns updated queue

**`findCandidatesJLPT(activeIds, kanjiKnowledge, maxToFind, ignoreKnownKanji?)`** (private)
- Backs `preferredLearningOrder: 'jlpt'`. Walks N5 → N1 (`JLPT_LEVELS`), frequency-ordered within each level, off `index/jlpt.json`.
- **Kanji-filtered by default**, same as every other order - only skipped when `settings.ignoreKnownKanjiRequirement` is on. The mode's defining feature is following the official level lists exactly (a user studying for a specific sitting covers that level's vocabulary as published); enforcing known kanji by default keeps that combined with the app's kanji-aware learning goal instead of overriding it, while the opt-in toggle preserves the old unconditional behavior for anyone who wants a level's list exactly regardless of kanji already studied.
- The JLPT lists cover only ~6.4k of ~36k words, so once drained it **falls back to `findCandidatesFrequency`** (respecting the same `ignoreKnownKanjiRequirement` flag) rather than stranding the user on the "exhausted" screen. `countLearnableVocabulary` mirrors this, delegating to the frequency count only when the JLPT pool hits zero - the two pools overlap heavily and must never be summed.
- `kklc` is unaffected by `ignoreKnownKanjiRequirement` either way, since it's gated by step, not by kanji set.

**`applyVocabIntroChoice(progress, choice)`**
- Handles "Learn" or "Skip" on intro card
- **Learn**: Sets `nextReviewAt = now` (becomes immediately reviewable)
- **Skip**: Sets stage to `'graduated'`, maxMemoryStrength (never appears again)

### Scheduling Service (`scheduling.ts`)

**Single source of truth** for "when is this vocab due" and "is it fully mastered". Previously this question was answered independently in three places (`VocabProgress.nextReviewAt` hand-synced by `applyAnswer`, `reading.dueDate`, `meaning.dueDate`), which could drift out of agreement - e.g. disabling meaning quizzes left a stale `meaning.dueDate` able to make `nextReviewAt` report "due" while queue-selection had already stopped considering meaning reviews.

**Key functions:**
- `isEntryMastered(entry)`: `memoryStrength >= maxMemoryStrength`
- `isVocabFullyMastered(vocab, settings)`: reading mastered AND (meaning quizzes disabled OR meaning mastered)
- `vocabNextReviewAt(vocab, settings)`: derives the authoritative `nextReviewAt` - the earlier of non-mastered reading/meaning due dates, **excluding meaning entirely when `enableMeaningQuiz` is false**
- `isVocabDue(vocab, settings, now)`: convenience wrapper (always false for graduated items)

`SRSService.applyAnswer` calls into this module rather than hand-computing `nextReviewAt`/`stage`; `sync/mergeProgress.ts` and the v8+ migration pass do the same, so all three call sites can never disagree.

#### SRS Formula Constants (from `constants.ts`)
- `targetRecall`: 0.75 (75% target recall rate)
- `expectedLatency`: 1500ms
- `minInterval`: 0.2 days (~5 hours)
- `maxInterval`: 3650 days (10 years)
- `maxMemoryStrength`: 1270 (≈1 year interval = mastery)
- `resultFactors`: correct +0.25, minor_error +0.10, wrong -0.40, pass -0.15

### Vocabulary Service (`vocabulary.service.ts`)

Handles loading vocabulary data from compiled JSON files.

**Static Methods:**
- `loadKKLCKanjiIndex()`: Load KKLC kanji index (step → kanji[])
- `loadKKLCIndex()`: Load KKLC vocab index (step → vocabIds[])
- `loadFrequencyIndex()`: Load frequency-sorted vocab index
- `loadVocab(id)`: Load individual vocabulary by ID (cached)
- `loadKanjiIndex()`: Load the full compiled `Kanji[]` array (small, whole-file fetch, cached) and index it by character in-memory
- `loadKanji(character)`: Look up a single `Kanji` by character (used by the Kanji Detail Page)
- `loadKanjiVocabIndex()`: Load the kanji → vocabIds reverse index (which vocab contain a given kanji, sorted by frequency)
- `loadJlptIndex()`: Load the JLPT level → vocab index (level 1..5 → entries, frequency-sorted within a level)

**Data Location**: `data/compiled/`
- Indexes: `index/kklc.json`, `index/kklc-kanji.json`, `index/frequency.json`, `index/kanji-vocab.json` (kanji character → vocab IDs containing it, frequency-sorted), `index/jlpt.json` (JLPT level → `{id, containedKanji}[]`, frequency-sorted within each level; ~6.4k of the ~36k vocab carry a level)
- Vocabulary: `vocab/{id}.json` (one file per vocab item)
- Kanji: `kanji.json` (flat array of all `Kanji` objects)

### Storage Service (`storage.service.ts`)

Local storage wrapper for user data persistence.

**Keys** (from `constants.ts`):
- `GOKAN_SRS_PROGRESS`: User progress data
- `GOKAN_SRS_SETTINGS`: User settings

### Google Drive Sync (`services/sync/`)

Cloud sync, split into three modules by responsibility:

**`driveClient.ts`** - Thin wrapper around the Drive v3 REST API (folder/file list, download, upload, trash). No merge/business logic - just HTTP calls and `GoogleAuthError` translation on 401/403, so it can be unit-tested without a network by mocking the class methods it needs.

**`mergeProgress.ts`** (pure, no I/O) - Reconciliation logic:
- `mergeEntry(local, remote)`: merges one `SRSEntry` (reading OR meaning) - the entry with the more recent `lastReviewedAt` wins scheduling-relevant fields (dueDate, difficulty), while `memoryStrength`/`interval` are each taken as the **max** of both sides as a safety net; `history` is a full union deduped by timestamp.
- `mergeVocabProgress(local, remote, settings)`: merges reading and meaning **independently** via `mergeEntry` - a device that only reviewed reading can never clobber another device's meaning review (and vice versa). `stage`/`nextReviewAt` are always **re-derived** via `scheduling.ts`, never merged directly.
- `mergeLearningQueues`: pure union by `vocabId` (never drops a word).
- `mergeProgress`/`mergeSettings`: top-level merge - kanji knowledge is last-version-wins (local wins on a tie, to preserve un-pushed local edits/deletions), stats are field-wise max, `dailyOverride` is OR'd, and the sync version counter always bumps by 1 past the higher input.

**`googleDriveSync.ts`** (`GoogleDriveSync` class) - Orchestrates the above against Drive:
- **Optimistic concurrency**: captures the remote file's `modifiedTime` when read, re-verifies it immediately before writing, and retries (re-fetch + re-merge, up to 3 attempts) if it changed - closes the classic read-modify-write lost-update window.
- **Duplicate-file reconciliation**: if more than one file matches the expected name (two devices creating it concurrently), all copies are downloaded, merged together, written back to one canonical file, and the rest are trashed.
- **`ensureRemoteBackupOnce()`**: write-once safety net - before this instance's first write, snapshots the current live remote file under `kanji-progress.pre-v8-backup.json`. No-ops if a backup already exists or there's nothing live to back up. Failures are logged but non-fatal (the local backup below is the primary safety net).

**Surfacing background changes to the UI**: `GoogleDriveContext` exposes `lastBackgroundMergeTime` (bumped after a successful background sync) separately from `lastDownloadTime` (bumped only on a full blocking download). `useQuizOrchestration` reconciles (merges) remote changes into live React state via the `RECONCILE_REMOTE` action rather than replacing state wholesale, so an answer submitted mid-sync is never silently overwritten. A `syncPaused` flag surfaces an expired/invalid token visibly (`SyncStatusIndicator` in `App.tsx` shows a reconnect button) instead of silently stopping uploads.

### Data Safety (`backup.service.ts`, `progressSerialization.ts`)

**`BackupService`**: write-once local safety net. `ensureLocalBackupOnce(rawJson)` snapshots the exact raw (un-migrated) localStorage bytes under `GOKAN_SRS_PROGRESS_BACKUP_PREV8` the first time `StorageService.loadProgress()` runs - before any migration logic touches them. Never overwritten once written.

**`progressSerialization.ts`**: single shared (de)serialization module used by both `storage.service.ts` and `sync/googleDriveSync.ts`, so a stored payload always hydrates into the exact same in-memory shape regardless of which channel it came from (fixes a previous divergence where the two channels handled `Date`/`Set` fields slightly differently). Exposes `toPlainProgressJSON`, `hydrateProgress`, and `migrateAndHydrateProgress` (migration + hydration in one call).

### Migration Service (`migration.service.ts`)

Handles data format upgrades to ensure backward compatibility.

**Two-tier version scheme:**
- `SYNC_MIGRATION_VERSION` (7): the ceiling the **synchronous** pass (`migrateUserProgress`) can ever stamp on its own.
- `CURRENT_FORMAT_VERSION` (8): the true terminal version, reachable **only** after the **async** homograph-merge pass (`migrateMergedVocabsAsync`) has actually run.

Previously both were the same constant, so the cheap synchronous pass could stamp the terminal version on its own and pre-empt the async pass entirely - `needsMigration()` would report `false` immediately after a single synchronous load, and the homograph-merge migration (which needs a network fetch) would silently never run. `migrateUserProgress` now caps at `SYNC_MIGRATION_VERSION`, so `needsMigration()` correctly keeps reporting `true` until the async pass has actually completed.

**Features:**
- Converts old `mastery` (0-100) system to new `memoryStrength`/`interval` system
- Normalizes `needsRetry` (legacy boolean → per-type `{reading?, meaning?}` object) **unconditionally**, regardless of format version, since the field isn't tied to the version-gated passes
- Recomputes `nextReviewAt` unconditionally via `scheduling.ts` on every load, retroactively correcting any value written before that derivation existed
- Idempotent migration (already-migrated data not re-migrated)
- Automatic migration on data load (Storage & Google Drive)

**Conversion Formula:**
- `memoryStrength = (mastery / 100) * maxMemoryStrength`
- mastery 0 → memoryStrength 0 (beginner)
- mastery 100 → memoryStrength 1270 (≈1 year interval, mastered)

---

## State Management

### Quiz State (`context/quiz/`)

The quiz state machine is split into four single-responsibility modules rather than one monolithic provider:

- **`quizReducer.ts`** - Pure `QuizState`/`QuizAction`/reducer. No I/O, no side effects, no `Date.now()` calls - fully unit-testable in isolation (`quizReducer.test.ts`).
- **`quizSelectors.ts`** - `selectNextView(state, hasMoreLearnable, now)` is the **single source of truth** for "what should the quiz screen show right now". It replaces three previously-independent decision points (a queue-level `nextDue` memo, a `computeSessionView` function, and an ad-hoc `currentProgress.introductionAt` check in `QuizScreen`) that could drift out of agreement. Returns `{ queueItem, sessionState, nextReviewAt, shouldShowIntro }`. Also exposes `selectCurrentProgress`, `selectCurrentSentence`, `collectActionableTaskKeys` (every quiz task actionable now, as `TaskKey[]`), `filterSessionCommit` (drops a vocab's `meaning` key from a snapshot when its `reading` key is present too - see `session` below for why), and `selectSessionStats`. `selectSessionStats(state, hasMoreLearnable, now)` returns `{ done, total, retriesPending, waiting, moreNew }` computed against `state.session.committed`: `total` = committed set size (**fixed** for the session), `done` = committed tasks no longer actionable, `retriesPending` = committed tasks currently awaiting a retry (a wrong answer this session, shown highlighted and appended to the bar denominator), `waiting` = distinct vocab with tasks due *now* that aren't part of the session, `moreNew` = `hasMoreLearnable` (the "+" in "n+ waiting"). This replaced a `done + liveDueReviews` formula whose denominator **shrank on every wrong answer** (a wrong answer pushes the due date ~12h out - leaving the live due count - without incrementing `done`, and the pending retry was never re-counted).
- **`useQuizOrchestration.ts`** - Every effect (vocab/sentence loading, auto-advance timing, daily reset, persistence, migration triggering, Drive sync reconciliation, **session lifecycle** `SESSION_START`/`SESSION_END`) and every action (`submitAnswer`, `continueToNext`, `advanceQueue`, etc.), returning `{ actions, nextView, currentProgress, computed, sessionStats }`. Mount-once effects use a `useRef` guard instead of the previous string-hack dependency array (`[state.progress ? 'loaded' : 'loading']`). Reads `useLocation()` (it renders inside `QuizProvider`, itself inside `BrowserRouter` - see `main.tsx`) to gate both the vocab-loading effect and the session-lifecycle effect to the `/quiz` route, so browsing Settings/Stats/the Main hub neither keeps fetching vocab in the background nor keeps a session alive - see the Main Screen entry in Application Pages.
- **`QuizProvider.tsx`** - Thin assembler: `useReducer(quizReducer, ...)` + `useQuizOrchestration(...)`, wires the result into `QuizContext.Provider`. Owns the public `QuizContextValue` interface.

`useQuiz.ts` (unchanged location) still exposes the `useQuiz()` hook and `QuizContext` object; its type import now points at `./quiz/QuizProvider`.

#### State Shape (`QuizState`)
```typescript
{
  progress: UserProgress | null,
  settings: UserSettings | null,
  currentVocab: Vocabulary | null,
  currentSentences: Sentence[] | null,
  currentSentenceId: string | null,
  currentQuizItem: PendingQuizItem | null,
  userAnswer: string,
  feedback: { show, correct, type, message, matchedAnswer } | null,
  isLoadingVocab: boolean,
  isEvaluatingAi: boolean,
  introCandidates: Vocabulary[],
  nextKanjiToLearn: { step: number; kanjis: string[] } | null,
  sessionHistory: Array<{ vocabId, writtenForm, result, delta }>,
  session: { committed: TaskKey[]; reviewed: number; correct: number; incorrect: number } | null,   // active study session's frozen task set + running answer tally
  lastSessionRecap: { reviewed: number; correct: number; incorrect: number } | null,   // most recently ended session's tally, shown once on the Main hub
  fatalError: string | null
}
```

**`session` (the committed task set + running tally)**: `TaskKey` is `` `${vocabId}:${quizType}` `` (built via the exported `taskKey()` helper). `session.committed` is captured **once** when a study session begins - a snapshot of every quiz task actionable at that moment (`collectActionableTaskKeys`), passed through `filterSessionCommit` before committing - and is extended only by the user's own "Learn" choices (`VOCAB_INTRO_CHOICE` adds the learned word's `reading` task). It never grows from background reviews coming due mid-session. `session.reviewed`/`correct`/`incorrect` accumulate on every `UPDATE_AFTER_ANSWER` while a session is active (retries included - see Main Screen below for how this backs the end-of-session recap), grouping `correct`/`minor_error` as correct and `wrong`/`pass` as incorrect, matching `DailyProgressionChart`'s convention.

**Session lifecycle is now route-gated** (see `[2026-08-02]` Main Screen entry below): a session can only be active while the user is on `/quiz`, so navigating to any other page (the Main hub, Settings, Stats, ...) ends it exactly like running out of due work does. `SESSION_END` always snapshots the just-ended session's tally into `lastSessionRecap` (even a zero-answer session ended by leaving immediately) - `DISMISS_SESSION_RECAP` clears it once the user has seen it on the Main hub.

`filterSessionCommit` drops a vocab's `meaning` key whenever its `reading` key is committed too: answering that reading correctly staggers the meaning's due date forward by 12h (`SRSService.applyAnswer`'s reading→meaning stagger), so committing both counted the meaning as session workload it was very likely to never actually be answered for - one reading answer silently incremented `done` by 2 instead of 1. Mirrors how `VOCAB_INTRO_CHOICE`'s "Learn" path already treats a freshly-learned word (only reading joins the session; the staggered meaning surfaces later as "waiting"). This filtering is applied only at commit time, not to the live actionable set `selectSessionStats` itself computes for the `done`/`waiting` checks - a *wrong* reading answer does not stagger meaning, so it must stay reachable there. This is what makes the session-progress counter's denominator **stable**: `selectSessionStats` counts `done`/`total`/`retriesPending` against this frozen set, and reports mid-session arrivals separately as "waiting" (see `selectSessionStats` below). The lifecycle (`SESSION_START` on entering review/learn, `SESSION_END` on reaching waiting/exhausted) is driven by an effect in `useQuizOrchestration`, which computes the snapshot with `now` so the reducer stays free of `Date.now()`.

Note: this is **not** the old `sessionQueue`/`sessionBuiltAt` subsystem (a prior "frozen session queue" refactor, see historical `[2026-02-28]` log entry, that nothing ever read - deleted as dead code). The `session` field here is a lightweight task-key set read *only* by the progress counter; it does **not** decide what card to show next (that is still `selectNextView`, live). Retry-on-wrong-answer is still handled entirely by the per-type `needsRetry` flag on `VocabProgress`.

#### Actions
- `SETUP_COMPLETE`: Initialize progress after setup
- `LOAD_VOCAB_START/SUCCESS/ERROR`: Vocabulary loading states
- `SET_ANSWER`: Update user input
- `SUBMIT_ANSWER`: Process answer submission
- `UPDATE_AFTER_ANSWER`: Apply the (already-computed) SRS update after `continueToNext`
- `ADVANCE_QUEUE`: Move to next vocab item / fetch intro candidates
- `SAVE_SETTINGS`: Update user settings (clears `introCandidates` if the learning order changed)
- `UPDATE_KANJI_KNOWLEDGE`: Update known kanji. Clears `introCandidates` and `nextKanjiToLearn` when the knowledge actually changed (method, step, or kanji set), since which vocabulary is optimal to learn next depends directly on the known kanji - the same invalidation `SAVE_SETTINGS` performs on a learning-order change. Returns state **unchanged** for an identical payload, because `KanjiKnowledgeEditor` fires its `onChange` on mount as well as on edit and must not discard a valid buffer (or loop).
- `OVERRIDE_DAILY_LIMIT`: Bypass daily new vocab limit (legacy - the limit itself is effectively disabled)
- `VOCAB_INTRO_CHOICE`: Handle Learn/Skip on intro card. On "Learn" with an active session, also adds the word's `reading` task to `session.committed` so a word the user chose to learn counts toward the session total (Skip graduates immediately and adds nothing).
- `SET_NEXT_KANJI` / `LEARN_NEXT_KANJI`: KKLC step-unlock flow
- `SESSION_START` / `SESSION_END`: Set/clear `session` (the frozen task set + tally behind the progress counter and recap). `SESSION_START` takes the pre-computed `taskKeys` snapshot and zeroes the tally; `SESSION_END` is a no-op (same reference) when no session is active, otherwise captures the session's tally into `lastSessionRecap` before clearing it.
- `DISMISS_SESSION_RECAP`: Clears `lastSessionRecap` (no-op, same reference, if already null). Fired by the Main hub once the user has seen the recap card.
- `RESET`: Clear all progress
- `RESET_DAILY_STATS`: Reset daily counters (midnight)
- `RECONCILE_REMOTE`: Assign an already-merged `{progress, settings}` from a background Drive sync. The merge itself happens in `useQuizOrchestration` (via `sync/mergeProgress.ts`) **before** dispatch, so the reducer just assigns the result - everything else (`currentVocab`, `userAnswer`, `feedback`) is left untouched, so a background sync can never interrupt an answer in progress.

#### Computed Values
- `isSetupComplete`: Whether initial setup is done
- `sessionState`: Current session state (review/learn/learn-kanji/waiting/exhausted) - derived by `selectNextView`
- `shouldShowIntro`: Whether the currently-loaded vocab should show the intro card - also derived by `selectNextView`
- `currentProgress`: VocabProgress for current vocab
- `nextReviewAt`: Next review timestamp

#### Key Functions
- `setupComplete({ kanjiKnowledge, settings })`: Complete initial setup
- `submitAnswer()`: Evaluate and record answer
- `advanceQueue({ now, overrideDailyLimit })`: Load next vocab
- `continueToNext()`: Move to next item after feedback (calls `SRSService.applyAnswer` exactly once per answer - a prior version called it twice, once for the mastery-delta history entry and once for the queue update)
- `saveVocabIntroChoice(vocab, 'learn'|'skip')`: Handle intro card choice

---

## Application Pages

### Main Screen (`pages/main/MainScreen.tsx`)

The activity hub - the landing page (route `/`) after setup, replacing the previous behavior of dropping users straight into the quiz. Activities (the main actions a user can take) are presented as cards; currently just "Vocabulary quiz session", which navigates to `/quiz`. Settings, Stats, and Kanji are **not** activities - they stay in the global header toolbar (`App.tsx`, rendered outside `<Routes>` so it's present on every page), unchanged by this page's introduction.

Also renders the end-of-session recap (`state.lastSessionRecap`) when one is pending: reviewed count and a correct/incorrect breakdown, with a dismiss button (`actions.dismissSessionRecap()`) that clears it. Shown regardless of whether the session that produced it ended naturally (ran out of due work) or the user left early by navigating away - see Quiz Screen below and the `[2026-08-02]` changelog entry.

### Quiz Screen (`pages/quiz/QuizScreen.tsx`)

Route `/quiz`. The study session itself - **explicit and boundable**, per the Main Screen's activity model: starting it snapshots the vocab available at that moment (`session.committed`, see State Management), and it ends the moment the user navigates to any other page (Main hub, Settings, Stats, ...) or naturally runs out of due work. Leaving early and running out both end the session identically and always produce a recap on the Main hub - there's no separate "abandoned session" state. Resuming later (navigating back to `/quiz`) starts a brand new session against whatever is available then, never reopening the previous one.

Main study interface. Switches **exhaustively** on `sessionState` (a TypeScript `never` check at the `default` case fails to compile if a new `SessionState` value is ever added without being handled):

- **`'waiting'`**: Show `WaitingScreen` (next review time). Includes a "Back to activities" link to `/`, since `/quiz` is now a sub-page reached from the Main hub rather than the landing page itself.
- **`'exhausted'`**: Show `ExhaustedScreen` (no more content). Same "Back to activities" link as `WaitingScreen`.
- **`'learn-kanji'`**: Show `LearnKanjiCard` (KKLC step unlock)
- **`'review'` / `'learn'`**: Loading gate, then `shouldShowIntro` (from `selectNextView`) decides `VocabIntroCard` vs. the active quiz card (`QuizCard` for reading, `MeaningQuizCard` for meaning, keyed on `currentQuizItem.quizType`)

**Auto-advance logic**: Owned by `useQuizOrchestration`. If the queue has no valid items but can introduce new vocab, automatically calls `advanceQueue()`.

**Shared formatting** (`pages/quiz/quizFormatting.ts`): `formatReadingList`, `getUniquePosTags`, `getUniqueRelatedCompounds`, and the `useExpandableDefinitions` hook are shared across `QuizCard`, `MeaningQuizCard`, and `VocabIntroCard` rather than being reimplemented in each.

### Onboarding Flow (`pages/setup/OnboardingFlow.tsx`)

Wrapper for new users, replacing a direct `SetupScreen` call. Manages a two-step process:
1. **Welcome Screen** (`WelcomeScreen.tsx`): Explains the app's philosophy and offers three paths:
   - *Just starting out (Beginner)*: Skips the wizard entirely - initializes with KKLC step 0, an empty kanji set, and the `kanji_coverage` learning order.
   - *I already know some kanji (Kanji Learner)*: Proceeds to the Setup Screen wizard.
   - *Already have an account*: `GoogleLoginButton` - Drive login to restore existing progress (auto-retries the download once authenticated).
2. **Setup Screen** (`SetupScreen.tsx`): The wizard for the "Kanji Learner" path - collects kanji knowledge (method + step/count) and learning order preferences.

Calls `actions.setupComplete()` when either path produces a valid `SetupValues` object.

### Settings Screen (`pages/settings/Settings.tsx`)

- Change learning order (frequency/KKLC)
- "Ignore known kanji requirement" toggle (`ignoreKnownKanjiRequirement`), shown for every order except `kklc` (a no-op there, since it's gated by step rather than by kanji set) - including `jlpt`, which is kanji-filtered by default and relies on this toggle to opt back into its old unconditional behavior
- Reset progress (with confirmation)

### Profile Screen (`pages/profile/UserProfileScreen.tsx`)

- View/edit kanji knowledge
- Update known kanji set

### Kanji Detail Screen (`pages/kanji/KanjiDetailScreen.tsx`)

Route: `/kanji/:character`. Mirrors `VocabDetailScreen`'s card-based layout at a smaller scale:
- Kanji glyph, JLPT chip (`steps.jlpt`, if set), KKLC step, frequency rank, and a "Known" badge if the character is in the user's `kanjiKnowledge.kanjiSet`
- `KanjiVocabListCard` (`pages/kanji/KanjiVocabListCard.tsx`): capped/expandable list (mirrors `VocabRelationshipsCard`'s pattern) of vocabulary containing this kanji, sourced from the `kanji-vocab.json` reverse index, each row navigating to `/vocab/:id`

`VocabDetailScreen`'s kanji-breakdown card (see Core Data Models → Vocabulary) provides the reverse link: each kanji in a word's `containedKanji` is a clickable chip navigating to `/kanji/:character`, so users can move vocab → kanji → vocab.

### Statistics Screen (`pages/stats/StatsScreen.tsx`)

- `StatsOverview` - headline counters (including Kanji Coverage)
- `KnowledgeCurveChart` - cumulative knowledge held over time (steady growth vs. plateau); see `utils/knowledge.utils.ts`
- `JlptCoverageChart` - five stacked bars (N5 at top → N1), each showing mastered / in-progress / untouched against that level's total, off `index/jlpt.json`. "Mastered" uses `isVocabFullyMastered` so the split matches the scheduler's definition rather than reimplementing it. One hue in two steps (solid accent + 35% accent) rather than two hues, since the segments are ordinal stages and the design system reserves the secondary accent for errors; a legend and direct `n / total` labels carry the distinction so it never rests on color alone
- `DailyProgressionChart` - per-day review activity (correct/incorrect), last 14 days
- `ReviewForecast` - upcoming review load
- `SmartVocabList` - searchable/sortable/paginated vocabulary list. Fully-mastered items are **hidden by default** (via `isVocabFullyMastered`) behind a "Show mastered (N)" checkbox; search/sort/page/showMastered all persist in `sessionStorage` so returning from a vocab detail page restores the list

---

## gokan-dictionary App

`apps/gokan-dictionary` is a separate, standalone Svelte + Vite app (own `package.json`, own tests) implementing [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19): SEO-crawlable static pages for every kanji and vocabulary entry in the compiled dataset, for visitors who just want to look something up without going through gokan-srs's setup flow. It shares no code or runtime with gokan-srs beyond the 5 duplicated model files (see Project Structure) and the dataset submodule both consume - no gokan-srs UI, routing, or quiz logic is reachable from it. Grammar entries (mentioned in the issue title as future work) are not implemented yet - only kanji and vocabulary.

### Static generation model

There is no client-side router or SSR framework (SvelteKit, Next.js, etc.) - the resolved decision on issue #19 was "build-time pre-rendering... kept deliberately lightweight". Every page is a plain static `index.html` file, generated once at build time by `scripts/prerender.ts` and served by any static host with no server runtime.

- `scripts/svelte-ssr-loader.ts` registers a Bun runtime plugin that compiles `.svelte` files with `svelte/compiler`'s `generate: 'server'` mode directly - independent of the Vite build entirely, since Svelte's own `svelte/server` `render()` only turns a component into an HTML *fragment*, and normally you'd reach that via a framework's build integration. This runs standalone via Bun (not `vite build --ssr`) so `bun run scripts/prerender.ts` can directly `import()` the page components after the plugin registers - it must be imported for its side effect *before* any `.svelte` import, so those imports are dynamic (`await import(...)`), never static top-of-file ones.
- `scripts/prerender.ts` (the actual generator): resolves the compiled dataset (via `dataset.server.ts`, auto-initializing the `gokan-dataset` submodule if this app's own CI hasn't checked it out - see Dataset Consumption below), renders `HomePage`/`VocabPage`/`KanjiPage` (`src/pages/`) per entry with `svelte/server`'s `render()`, wraps each fragment in a full HTML document via `documentShell.ts` (SEO meta, canonical link, JSON-LD, asset links), and writes `dist/vocab/{id}/index.html`, `dist/kanji/{character}/index.html`, `dist/index.html`, `dist/sitemap.xml`, `dist/robots.txt`, and `dist/data/search.json`. Generates all ~35,800 vocab pages + ~2,300 kanji pages in about 10-15 seconds locally.
  - **Kanji directory names are the raw UTF-8 character, never percent-encoded** - static hosts decode a request URL's percent-escapes before resolving a file on disk, so writing `dist/kanji/%E6%80%9D/` instead of `dist/kanji/思/` would break navigation from a real percent-encoded href like `/kanji/%E6%80%9D/`. `urls.ts`'s `kanjiPath()` percent-encodes for embedding in href/canonical/sitemap strings; the filesystem write path uses the raw character directly. Verified against Vite's own preview server - both URL forms resolve to the identical file.
  - Cross-page links (a word's kanji breakdown, "used in"/"made of" related words, a kanji's vocab list) are resolved through a one-pass `Map<id, VocabSummary>` built by `vocabSummary.ts` before the main per-page loop, rather than re-reading each referenced vocab file on demand - keeps memory bounded to lightweight summaries instead of every full parsed `Vocabulary` object, while still avoiding N+1 re-reads for popular vocab referenced from many kanji pages. A kanji's vocab list is capped at 50 entries (with a "Showing N of total" note) since some common kanji appear in 100+ words. Components/parents ids that don't resolve to a summary (e.g. stale references) are dropped from the page rather than failing the build, with a single aggregate warning logged - not treated as the kind of fatal data-integrity error gokan-srs's own Error Handling policy describes, since this is a best-effort batch generator over ~38k pages, not an interactive app serving one user's data.
- `vite.config.ts`'s only production-relevant job is building the two browser-facing assets every static page links to: the global stylesheet (`src/app.css`) and the search script (`src/client/search.ts`), listed as explicit `build.rollupOptions.input` entries so Vite content-hashes and manifests them (`dist/.vite/manifest.json`, read by `prerender.ts`). `index.html`/`App.svelte` are a `vite dev`-only placeholder explaining the static-generation model - there's no production SPA shell for them to belong to.
- Page components (`src/pages/*.svelte`) deliberately have **no `<style>` blocks** - all styling is one hand-written global stylesheet (`src/app.css`, following [docs/DESIGN_SYSTEM.md](../../docs/DESIGN_SYSTEM.md): calm, Indigo accent, Source Serif 4 + Inter, Noto Serif/Sans JP for Japanese). This sidesteps needing Vite's per-component CSS extraction to work for components that are compiled outside Vite's own module graph (see the SSR loader above) - a global stylesheet built as its own Vite entry is simple and correct for a catalog this shallow (three page shapes total: home, vocab, kanji).

### Client-side interactivity

The only interactive piece on the entire site is the home page's search box (`src/client/search.ts`) - vocab/kanji pages ship zero JS. It's plain DOM/TS progressive enhancement, not a hydrated Svelte island: fetches `/data/search.json` (copied from the compiled dataset's `index/search.json`, ~3MB) lazily on first focus/input, then filters client-side by kanji/reading/meaning substring match, debounced. `matches()`/`filterEntries()` are pure and unit-tested; the DOM wiring (`init()`) is thin glue and untested, consistent with this repo's general pure-logic/thin-glue testing split.

### Dataset consumption

Reads the same `gokan-dataset` submodule as gokan-srs (see gokan-srs's Dataset Consumption section above), but resolved independently: `src/lib/dataset.server.ts`'s `resolveCompiledDir()` walks up to the shared `apps/gokan-srs/dataset/compiled` path and auto-runs `git submodule update --init` if it's missing, since gokan-dictionary's own CI (`ci-gokan-dictionary.yml`) does not check out submodules (`submodules: true` was gokan-srs's own deploy workflow's fix, and editing workflow files is out of scope for automated changes here) - this is the one remaining place that can fetch it before a build needs real data. Node-only (`node:fs`/`node:child_process`) and never imported from a `.svelte` component - see that file's own header comment. `src/models/*.ts` are a second, independent copy of the same 5 shared model files gokan-srs has (see that repo's Project Structure note), trimmed to what this app actually reads (no `VocabProgress`/`SRSEntry`/learning-order fields) plus `isCommon`, a field the compiled dataset always emits that gokan-srs's own copy of `Vocabulary` still omits.

### Tests

Vitest, same as gokan-srs. Pure logic is unit-tested directly; `scripts/prerender.ts` and `scripts/svelte-ssr-loader.ts` themselves are thin I/O orchestration and are not unit-tested - verified instead by actually running `bun run build` against the real dataset and inspecting `dist/` output plus a full in-browser QA pass (search → vocab page → kanji page navigation, screenshots, zero console errors).

- `src/lib/dataset.server.test.ts` - loader tests against small fixture files under `src/lib/__fixtures__/compiled/` (not the real ~1.1GB submodule checkout).
- `src/lib/urls.test.ts`, `seo.test.ts`, `documentShell.test.ts`, `vocabSummary.test.ts`, `sitemap.test.ts` - pure helper tests.
- `src/client/search.test.ts` - `matches()`/`filterEntries()` only (DOM wiring untested).

No hosting infra exists for this app yet (deploying it is out of scope here - see the hard rule against touching deployment config/workflows in autonomous runs).

---

## Build & Development

### Commands

Run from the **monorepo root** (`bun install` there installs deps for every workspace app). The root `package.json` proxies the common `gokan-srs` commands directly; anything else runs via `--cwd apps/gokan-srs` (or `--cwd apps/gokan-dictionary`).

**Development:**
```bash
bun run dev                              # Start gokan-srs dev server (Vite)
bun run typecheck                        # gokan-srs TypeScript type checking
bun run lint                             # gokan-srs ESLint
bun run dictionary:dev                   # Start gokan-dictionary dev server
```

**Build:**
```bash
bun run build                            # gokan-srs production build
bun run --cwd apps/gokan-srs preview     # Preview gokan-srs production build
bun run dictionary:build                 # gokan-dictionary production build
```

**Testing:**
```bash
bun run test                             # Run all gokan-srs tests (Vitest)
bun run --cwd apps/gokan-srs test:watch  # Run gokan-srs tests in watch mode
```

**Dataset** (delegates into the `gokan-dataset` submodule - see below):
```bash
bun run dataset:sync                      # Copy dataset/compiled/ -> public/data/compiled/ (also runs automatically before dev/build)
bun run dataset:build                     # Regenerate the dataset from raw sources, then sync (~1-2 min)
bun run --cwd apps/gokan-srs build:kanji  # Compile KKLC kanji only (delegates into the submodule)
bun run --cwd apps/gokan-srs build:jlpt   # Rebuild only index/jlpt.json (delegates into the submodule)
```

### Dataset Consumption

The compiled dataset (kanji/vocab/sentences/indexes) is **not owned by this repo**. It lives in the separate [`gokan-dataset`](https://github.com/gokan-dev/gokan-dataset) repo - raw sources, the build pipeline (Kuromoji tokenization, JMDict/KKLC/JPDB/JLPT processing), and the compiled output all live there, documented for third-party consumption independent of this app in that repo's `docs/SCHEMA.md`.

`gokan-srs` consumes it as a **git submodule** at `apps/gokan-srs/dataset/` (a public repo, so CI needs no extra credentials to check it out - `submodules: true` on `actions/checkout` is sufficient):

- `apps/gokan-srs/scripts/sync-dataset.ts` copies `dataset/compiled/` → `public/data/compiled/` via a plain `fs.cpSync` - no transformation, since both sides agree on the shape. This runs automatically before `dev` and `build` (chained in `package.json`'s scripts), so `public/data/compiled/` is **no longer committed** to this repo (`.gitignore`'d) - it's purely a synced build artifact, regenerated on demand.
- `apps/gokan-srs/package.json`'s `build:data`/`build:kanji`/`build:jlpt`/`build:jpdb` scripts delegate into the submodule (`bun --cwd dataset build:data`, no `run` keyword - `bun --cwd <dir> run <script>` doesn't reliably execute the script, it's `--cwd`'s own flag scoped to `run`, not a global one composable this way) so the dataset can still be rebuilt from raw sources without leaving the monorepo, then re-sync automatically (`build:data` chains the sync at the end).
- The submodule is **outside** the root workspace glob (`apps/*` only matches direct children of `apps/`), so the root `bun install` does not install its dependencies. Run `bun install --cwd apps/gokan-srs/dataset` once before `build:data`/`build:kanji`/`build:jlpt`/`build:jpdb` will work (not needed for plain `dev`/`build`, which only read the already-committed `compiled/` output via the sync step, never execute anything inside the submodule).
- After cloning fresh, run `git submodule update --init --recursive` (or clone with `--recurse-submodules`) before `bun install`/`bun run dev` - otherwise `sync-dataset.ts` fails fast with a clear error rather than silently serving stale/missing data.
- Vitest's config (`vite.config.ts`) explicitly excludes `dataset/**` from its test glob, since the submodule has its own independent test suite and CI (would otherwise get picked up and double-run as part of `bun run test` here).
- Bumping which `gokan-dataset` commit this repo points to is a normal two-step submodule workflow: commit + push inside `apps/gokan-srs/dataset/` first (a separate repo), then commit the resulting pointer change here.

### Test Infrastructure

**Test Framework**: Vitest

**Test Files:**
- `src/services/srs.service.test.ts` - SRS algorithm unit tests
  - Formula verification tests (8 test cases covering different scenarios)
  - Minor error classification tests (Levenshtein distance validation)
  - Alternative reading matching tests
  - Per-quiz-type retry flag behavior tests
  - Meaning-quiz-disabled scheduling tests (graduation on reading mastery alone)
  - JLPT learning-order tests: N5→N1 walk order, kanji filtering on by default (and disabled via `ignoreKnownKanjiRequirement`), already-queued exclusion, frequency fallback once the lists run dry (without re-serving a JLPT word, and respecting the same toggle), and the matching `countLearnableVocabulary` counts
- `src/services/scheduling.test.ts` - `vocabNextReviewAt`/`isVocabFullyMastered`/`isVocabDue` unit tests
- `src/services/migration.service.test.ts` - Data migration tests
  - Old format (mastery) to new format (memoryStrength/interval) conversion
  - Edge cases (mastery 0, mastery 100)
  - Idempotency (already-migrated data not re-migrated)
  - Real production data samples
  - `needsRetry` boolean→object normalization
  - Two-tier version regression guards (sync pass never pre-empts the async pass)
- `src/services/migration.roundtrip.test.ts` - Golden round-trip test: a realistic snapshot spanning old/mixed/current-format items pushed through the full migrate→hydrate→serialize→reparse pipeline, asserting zero data loss (no vocab dropped, no history lost, no due date nulled)
- `src/context/quiz/quizReducer.test.ts` - Reducer unit tests (every action, including `RECONCILE_REMOTE`, `SESSION_START`/`SESSION_END`, and `VOCAB_INTRO_CHOICE` extending the session's committed task set on "Learn")
- `src/context/quiz/quizSelectors.test.ts` - `selectNextView` across all session states + the meaning-disabled edge case, `selectCurrentProgress`, `selectCurrentSentence`, `selectSessionStats` (stable `total`, `done` on de-actioned tasks, the pending-retry regression that no longer shrinks the total, mid-session arrivals counted as `waiting` not total, `moreNew`, and the reading/meaning-stagger regression - one reading answer must only increment `done` by 1, not 2), and `filterSessionCommit` directly
- `src/services/sync/mergeProgress.test.ts` - Per-entry merge tests, including the core fix: a device that only reviewed reading can never clobber another device's meaning review
- `src/services/sync/driveClient.test.ts` - Drive REST wrapper tests (auth-error translation)
- `src/services/sync/googleDriveSync.test.ts` - CAS retry-on-conflict, duplicate-file reconciliation, write-once remote backup
- `src/utils/knowledge.utils.test.ts` - Knowledge-points model tests: mastery-curve normalisation (a vocab mastered in reading + meaning is worth exactly 200), the interval→strength inversion (including undoing the `wrong`/`minor_error` post-processing multipliers and the frequency modifier), and curve construction (per-day bucketing, pre-window baseline collapsing, skipped-vocab crediting, knowledge loss after a failure, future-dated-log rejection)
- Data-pipeline tests (tokenizer/Kuromoji integration, data-integrity checks) now live in the `gokan-dataset` submodule's own test suite, not here - `vite.config.ts` explicitly excludes `dataset/**` so they aren't double-run as part of this repo's `bun run test`.

**CI/CD Integration:**
- GitHub Actions workflow (`.github/workflows/deploy.yml`) includes test stage
- Tests run automatically on push to main branch
- Deployment only proceeds if all tests pass
- Uses Bun as the test runner for consistency with development environment

---

## Functional Workflows

### Learning Queue Logic

The SRS study session follows a **stateless** priority system with natural buffering:

1. **Old Reviews + Retry Items (Priority 1)**:
   - Items with `totalReviews > 0` and `nextReviewAt <= now`
   - Items with `needsRetry === true` (wrong answer in current session)
   - These are mixed randomly together
   - Order: Random selection from the pool (to prevent interference effects)
   - **Reading and meaning quizzes are batched, and the active batch is sticky**: `getNextVocabToStudy(queue, settings, now, preferredType)` takes an optional `preferredType` hint (the `quizType` of the card currently on screen, threaded in by `selectNextView` from `state.currentQuizItem`). While that type still has actionable work, it keeps being served - even if an item of the *other* type becomes actionable mid-batch (a retry flag flipping, or a review simply coming due while the user studies). Only once the active type's pool runs dry does selection fall back to the reading > meaning priority. Without this, a reading item becoming due partway through a run of meaning quizzes would hijack the very next card - see the `[2026-07-24]` changelog entry for the bug this fixes and `QuizTypeIndicator` (`BaseQuizCard.tsx`) for the accompanying on-screen "Reading"/"Meaning" phase label.

2. **New Intros (Priority 2)**:
   - Items with `introductionAt === null` and `stage !== 'graduated'`
   - When queue runs out of reviewable items, **3 new vocab are introduced at once**
   - All get `nextReviewAt = now` when user chooses "Learn"

3. **First Reviews (Priority 3)**:
   - Items with `totalReviews === 0`, `introductionAt !== null`, and `nextReviewAt <= now`
   - These are introduced vocab that haven't been tested yet
   - Lower priority than new intros ensures buffering

4. **User Actions on Introduction**:
   - **Learn**: Item activates with base memory strength. `nextReviewAt` set to `now` (becomes immediately reviewable)
   - **Skip**: Item is marked as **Fully Mastered** (`maxMemoryStrength`). Stage set to `graduated`. It will not appear in reviews
   - **Mastery**: If `memoryStrength >= maxMemoryStrength` after a review, item graduates. `nextReviewAt` is cleared

5. **Retry Mechanism (Wrong Answers)**:
   - `needsRetry` is **per quiz type** (`{ reading?: boolean; meaning?: boolean }`): a wrong reading answer sets `needsRetry.reading` and never blocks a due meaning review (and vice versa).
   - When user gives wrong answer: `needsRetry.<type> = true` is set. Item review schedule is updated based on the failure.
   - Item appears in current session (mixed with old reviews)
   - On retry attempt:
     - If Correct: `needsRetry.<type> = false`. **SRS state is NOT updated** (training only). Original failure scheduling stands.
     - If Wrong: `needsRetry.<type> = true` (loop until correct). SRS state is NOT updated (prevent double penalty).
   - This ensures retries help user learn correct answer without artificially inflating memory strength after a failure.

6. **Queue Refill**:
   - Triggered automatically in `useQuizOrchestration` when `selectNextView`'s `queueItem` is null and `sessionState` is 'learn'
   - Adds 3 new vocab at once (batch size = 3)
   - Respects daily limits and kanji knowledge constraints

7. **Completion**:
   - Session ends when: No Due Reviews AND (Daily Limit Reached OR No More Learnable Content)

**Natural Flow Example**: 
- Introduce 3 vocab → All 3 get `nextReviewAt = now`
- Priority shows 3 more new intros (if available)
- After 3 more intros, no more new intros available
- System shows 6 pending first reviews
- Pattern: Intro × 3 → Intro × 3 → Quiz × 6 → Intro × 3 → ...
- If wrong answer: Item gets `needsRetry = true` → Appears again in current session

### Session State Computation

Implemented in `quizSelectors.ts` via `selectNextView()` - the single function that also decides the queue item to load and whether to show the intro card (see State Management above):

```typescript
if (hasDueReviews) return 'review'
if (canIntroduceNew && hasLearnableVocab) return 'learn'
if (hasUnlockedKanjiPending) return 'learn-kanji'
if (hasUpcomingReviews) return 'waiting'
return 'exhausted'
```

### Answer Evaluation Flow

1. User types answer (hiragana for reading, english for meaning)
2. `submitAnswer()` called in `QuizContext`
3. Determine `quizType` (`'reading'` | `'meaning'`) and `quizMode` (`'base'` | `'context'`) from `currentQuizItem`
4. Base Evaluation:
   - For **Reading**: `SRSService.evaluateAnswer()` checks against all readings (always `base` mode)
   - For **Meaning (`base` mode)**: `SRSService.evaluateMeaning()` checks strictly against all dictionary glosses
   - For **Meaning (`context` mode)**: First evaluates strictly with `evaluateMeaning()`, then:
     - If `enableGeminiContext` is enabled (the Settings master toggle) AND `geminiApiKey` is configured AND a sentence is available:
       - If `alwaysUseAiForMeaningContext` is `true` (default), AI validates ALL answers (including strict-correct ones)
       - If `alwaysUseAiForMeaningContext` is `false`, AI only validates answers that were strict-wrong or strict-minor_error
       - On AI network error (400, 500, etc.): silently falls back to the strict evaluation result
     - Note: `enableGeminiContext` gating was previously missing from this check - a `geminiApiKey` left over from before the user disabled the feature would silently keep triggering AI calls. Fixed so the toggle is actually authoritative.
5. Feedback shown (correct/incorrect + matched answer + optional AI note)
6. `continueToNext()` applies SRS update via `SRSService.applyAnswer()` passing both `quizType` and `quizMode`. Both `meaning_base` and `meaning_context` update the same `vocab.meaning` SRSEntry internally, but use different `expectedLatency` values (10s vs 15s) for the latency multiplier calculation.

### Daily Reset Logic

- `stats.newLearnedToday` resets at midnight
- Implemented via `RESET_DAILY_STATS` action
- Triggered by date change detection

---

## Constants & Configuration

### Key Constants (`commons/constants.ts`)

**SRS Limits:**
- `dailyNewLimit`: 20 new vocab per day
- `newVocabBatchSize`: 3 (introduce three at a time for buffered learning)
- `maxReviewsPerDay`: 150

**Quiz Timing:**
- `correctAnswerAutoAdvanceDelay`: 1800ms
- `incorrectAnswerRevealDelay`: 400ms

**Storage Keys:**
- `progressStorageKey`: "GOKAN_SRS_PROGRESS"
- `settingsStorageKey`: "GOKAN_SRS_SETTINGS"
- `googleDriveFileName`: "kanji-progress.json"

**Setup Defaults:**
- `defaultKanjiCount`: "10"
- `defaultKanjiLearningMethod`: 'kklc'
- `minimumKanjiCount`: 0
- `maximumKanjiCount`: 2300

---

## Error Handling

### Fatal Errors

**Data Integrity**: If a vocabulary file fails to load, the application must **suspend operation** (Critical Error). Silent skipping is not permitted as it masks fundamental data corruption.

**Error Display**: `App.tsx` checks `state.fatalError` and shows full-screen error with reload button.

**Error Sources:**
- Vocabulary file not found
- Index corruption
- Invalid data format

---

## Modification Log

> [!IMPORTANT]
> **Update this log when making functional changes.**
> Document the *result* of investigations and the *reasoning* behind system behavior changes.

- **[2026-08-04]**:
  - **gokan-dictionary implemented (issue #19)**: `apps/gokan-dictionary` went from a placeholder skeleton (added `[2026-07-26]` during the monorepo migration) to a working SEO-crawlable static dictionary - every kanji and vocabulary entry in the compiled dataset now has its own prerendered page. See the new [gokan-dictionary App](#gokan-dictionary-app) section above for the full architecture; summary of what changed:
    - Added `scripts/prerender.ts` + `scripts/svelte-ssr-loader.ts`: a hand-rolled static site generator, since the resolved decision on the issue was "build-time pre-rendering rather than a full SSR framework." The loader compiles `.svelte` files via `svelte/compiler`'s `generate: 'server'` mode through a Bun runtime plugin, independent of Vite's own build - validated directly against Svelte 5.56's actual compiler/server-runtime API (there's no framework wiring this for you outside SvelteKit). Generates ~35,800 vocab pages + ~2,300 kanji pages + home/sitemap.xml/robots.txt/search index in ~10-15s locally.
    - Added `src/pages/{Home,Vocab,Kanji}Page.svelte` (presentational, no `<style>` blocks - see `app.css`), `src/lib/*` (site/urls/seo/documentShell/vocabSummary/sitemap pure helpers, all unit-tested, plus `dataset.server.ts` carried over from the previous partial run), and `src/client/search.ts` (the site's only client-side JS: progressive-enhancement search box, fetches `/data/search.json` lazily).
    - Reconfigured `vite.config.ts` to build the global stylesheet and search script as explicit rollup inputs (manifest-tracked, hashed) instead of relying on `index.html`'s SPA entry, which is now a `vite dev`-only placeholder with no role in the production static output.
    - Fixed two things found during a full-dataset build + in-browser QA pass (Playwright, screenshots, zero console errors) rather than left as latent bugs: `tsconfig.json` was missing `@types/node`/the `"node"` types entry (dataset.server.ts's Node built-in imports didn't typecheck at all before this), and a flexbox sizing bug in `app.css`'s `.vocab-list-item` caused long glosses to wrap instead of truncating with an ellipsis on kanji pages with many associated words.
    - Deliberately out of scope, per the hard rule against touching deployment config in autonomous runs: no hosting infra (Terraform, CDN) was added, and `.github/workflows/ci-gokan-dictionary.yml` was not modified to add a test step even though the app now has real tests to run - `bun run --cwd apps/gokan-dictionary test` still needs to be added there by a human, or a future run with workflow-editing permission.

- **[2026-08-02]**:
  - **Main/activity hub page + bounded quiz sessions** (issue #16): New landing page reorganizing the app around activities instead of dropping users straight into the quiz.
    - **New `pages/main/MainScreen.tsx`**, route `/` (previously the quiz screen's route). Presents activities as cards - currently just "Vocabulary quiz session", navigating to the quiz's new route, `/quiz`. Settings/Stats/Kanji were already in the global header toolbar (`App.tsx`, rendered outside `<Routes>`) rather than being activities, so that part of the issue's ask was already satisfied - no change needed there beyond it now sitting above the hub instead of above the quiz.
    - **Sessions are explicit and boundable, gated to the `/quiz` route**: `useQuizOrchestration`'s session-lifecycle effect (previously keyed only on `nextView.sessionState`) now also reads `useLocation()` and requires `pathname === '/quiz'` to keep a session active - it's a legal descendant of `BrowserRouter` despite living above `<Routes>` (`QuizProvider` wraps `App` inside `BrowserRouter` in `main.tsx`). Navigating to any other page ends the session exactly like running out of due work does; navigating back to `/quiz` later starts a brand new one against whatever's available then. The vocab-loading effect got the same route gate, so browsing Settings/Stats/the hub no longer keeps fetching vocab JSON or silently advancing the queue for a card nobody's looking at.
    - **Session recap**: `SessionTracking` (the `session` field) gained `reviewed`/`correct`/`incorrect` counters, accumulated on every `UPDATE_AFTER_ANSWER` while a session is active (retries included), using the same correct-groups-minor_error / incorrect-groups-wrong-and-pass convention as `DailyProgressionChart`. `SESSION_END` now always snapshots these into a new `lastSessionRecap` state field before clearing the session - "always show a recap regardless of how the session ended" (issue's resolved decision) falls out naturally from ending-early and running-out both going through the same `SESSION_END` action. `MainScreen` renders the recap (if present) with a dismiss button wired to a new `DISMISS_SESSION_RECAP` action/`dismissSessionRecap()` context method.
    - `WaitingScreen`/`ExhaustedScreen` gained a "Back to activities" link to `/`, since `/quiz` is no longer the landing page - previously the only way back was the header logo.
    - Verified manually via a scripted browser pass (Playwright against the dev server): onboarding → hub → start session → answer a reading quiz (recorded 1 reviewed / 1 incorrect) → navigate back to hub via the header logo → recap card shows the right tally → dismiss clears it → header Stats icon still navigates correctly. `bun run typecheck`/`test`/`build` all pass (typecheck's two pre-existing `vite-plugin-checker` peer-dependency errors are unrelated, documented above).
  - **Fix - session-progress counter incrementing by 2 on a single answer**: Reported as "each quiz answer increments the count... by 2, not by one." Root cause: when a vocab's reading and meaning were both due at session start, both were committed to `session.committed`. `SRSService.applyAnswer`'s reading→meaning stagger (from the `[2026-02-21]` duplicate-quizzes fix) pushes the meaning's due date forward by 12h whenever its sibling reading is answered correctly - so one reading answer took *both* task keys out of the actionable set in the same dispatch, and `selectSessionStats`'s `done` (defined as "committed tasks no longer actionable") counted both, even though the meaning was never actually answered. Not a regression from any of today's other work - a pre-existing, undertested interaction between two independently-correct-looking pieces of logic.
    - Fixed with a new `filterSessionCommit` (`quizSelectors.ts`), applied only at session-commit time in `useQuizOrchestration`'s `SESSION_START` effect: drops a vocab's `meaning` key from the snapshot whenever its `reading` key is committed too, mirroring how `VOCAB_INTRO_CHOICE`'s "Learn" path already handles the identical situation (only reading joins the session; the staggered meaning surfaces later as "waiting" instead of inflating `done`). Deliberately does **not** touch the live actionable set `selectSessionStats` computes for its `done`/`waiting` checks - a *wrong* reading answer does not trigger the stagger, so the meaning must stay reachable there regardless of what got committed.
  - **Dataset split, Phase 2 - gokan-dataset consumed as a git submodule**: Completes the `[2026-07-26]`-era split (Phase 1 had only copied the pipeline/raw data into `gokan-dataset` for validation, leaving `gokan-srs` untouched as a fallback). With the copy validated byte-for-byte, this phase does the actual cutover.
    - `gokan-dataset` restructured: `public/data/compiled/` → `compiled/` (the "public/" nesting was an app-serving convention that didn't belong in a standalone repo meant for third-party consumption), added `docs/SCHEMA.md` (full compiled-output format documentation, verified field-by-field against real generated files - including `isCommon`, a field present on every vocab file but missing from the shared TS type, a pre-existing gap now at least documented) and a `LICENSE` (CC BY-SA 4.0, matching JMDict's own terms). Re-validated byte-for-byte after the path rename.
    - `gokan-srs` now consumes it as a **git submodule** at `apps/gokan-srs/dataset/` (HTTPS URL, not the SSH deploy-key alias used for `gokan-srs` itself - deploy keys are per-repo, so the existing one has no access to a different repo). Removed from `gokan-srs` entirely (now living only in the submodule): `data/raw/` (205MB, LFS), the build scripts (`build-kanji.ts`, `build-data.ts`, `build-jlpt-index.ts`, `build-common.ts`, `build-constants.ts`, the JPDB converter), `kuromoji.test.ts`, and `src/utils/tokenizer.ts` (confirmed unused elsewhere in `src/` before removing). The 5 shared model files (`vocabulary.model.ts`, `sentence.model.ts`, `kanji.model.ts`, `data.model.ts`, `index.model.ts`) stay in **both** repos - genuine app dependencies here (e.g. `data.model.ts`'s `TagsLookup`/`Tags` are used directly by `QuizCard`/`MeaningQuizCard`/`VocabDetailScreen`), not just build-time DTOs, so this is an intentional shared-contract duplication, not leftover data.
    - New `apps/gokan-srs/scripts/sync-dataset.ts`: copies `dataset/compiled/` → `public/data/compiled/` via `fs.cpSync`, fails fast with a clear error if the submodule hasn't been initialized. Wired to run automatically before `dev`/`build` (`package.json`). `public/data/compiled/` is now **gitignored**, not committed - it's a synced build artifact, not source of truth.
    - `apps/gokan-srs/package.json`'s `build:data`/`build:kanji`/`build:jlpt`/`build:jpdb` now delegate into the submodule (`bun --cwd dataset run ...`) rather than running local scripts, so the dataset can still be rebuilt from raw sources without leaving the monorepo - the explicit goal was "build/edit/deploy everything from the monorepo, but the data lives in its own repo."
    - `vite.config.ts` gained `test.exclude: [...configDefaults.exclude, 'dataset/**']` - without it, vitest's default glob picked up the submodule's own `kuromoji.test.ts` and double-ran it as part of this repo's test suite (harmless since it passed, but conceptually wrong - that's `gokan-dataset`'s own CI's job).
    - `.github/workflows/deploy.yml`'s `deploy` job (not `test`, which never touches compiled data) gained `submodules: true` on checkout - `gokan-dataset` is public, so no new credentials were needed.
    - `.gitattributes`'s LFS tracking line removed entirely (the only path it covered, `data/raw/**`, no longer exists here) and `.gitattributes` deleted (would've been empty).

- **[2026-07-26]**:
  - **Monorepo migration**: Converted the repo from a single Vite/React app at the repo root into a Bun-workspaces monorepo, to host a second, unrelated app (`gokan-dictionary`, the SEO static-pages companion planned in [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19)) without duplicating CI/IaC or splitting issue tracking across repos - the alternative considered was a fully separate `gokan-dictionary` repo (which was briefly created, then dissolved back into this one once the pipeline/issue-tracking duplication cost became concrete).
    - Everything previously at repo root (`src/`, `public/`, `data/`, `scripts/`, `terraform/`, config files, `package.json`) moved as-is into `apps/gokan-srs/` via `git mv` - no internal restructuring, only the path prefix changed. Verified via a side-by-side worktree diff against `main` that `typecheck`/`test`/`build` all produce identical results post-move (two pre-existing `typecheck` failures - an unrelated test-file type-narrowing issue and `vite-plugin-checker`'s optional-peer `.d.ts` errors - were confirmed present on `main` too, not introduced by this migration).
    - `apps/gokan-dictionary` added as a new Svelte + Vite workspace (build-time pre-rendering planned, not a full SSR framework) - currently a placeholder skeleton, real implementation tracked by issue #19.
    - Root `package.json` now declares `"workspaces": ["apps/*"]` and proxies the common `gokan-srs` commands; the old single-package `bun.lock` was dropped and regenerated at the workspace root (bun workspaces expect one lockfile covering all member packages, not one per app).
    - `.gitattributes`'s LFS glob (`data/raw/**`) and `.gitignore`'s anchored `src/**/*.js` pattern were repointed at the new nested path - the latter would have silently stopped working post-move since gitignore patterns containing a mid-string slash are anchored to the location of the `.gitignore` file. Also removed a stale `apps/` entry left over in `.gitignore` from the abandoned `[2026-07-18]` monorepo scaffolding attempt - had it stayed, it would have silently gitignored this entire migration.
    - `.github/workflows/deploy.yml` gained `paths: ['apps/gokan-srs/**', ...]` filtering and now builds/deploys from `apps/gokan-srs` explicitly (`bun run --cwd apps/gokan-srs ...`, `dist/` → `apps/gokan-srs/dist/` in the S3 sync steps). Also fixed the cache key's `hashFiles('**/bun.lockb')` (stale reference to a filename format this project never used - actual file is `bun.lock`) and added a `pull_request` trigger for the `test` job (previously tests only ran on push to `main`, meaning PRs got no CI signal at all before merge - relevant now that PRs are the intended review surface for autonomous/agent-driven work). The `deploy` job stays gated to `push` on `main` only.
    - New `.github/workflows/ci-gokan-dictionary.yml`: typecheck + build only, path-filtered to `apps/gokan-dictionary/**`, no deploy job yet (no hosting infra exists for it - out of scope until issue #19 is actually implemented).
    - `docs/` split: `DESIGN_SYSTEM.md` and `FUTURE_FEATURES.md` stayed at the monorepo root (ecosystem-wide concerns - shared visual language, roadmap spanning multiple repos); `ARCHITECTURE_AUDIT.md`, `FUTURE_REFACTORS.md`, and the `srs-*.txt` formula research notes moved into `apps/gokan-srs/docs/` (gokan-srs-internals-specific). This folded in a pending uncommitted local change (moving these same docs from repo root into a `docs/` folder plus adding `FUTURE_FEATURES.md`) that predated this migration - committed first, separately, so it wouldn't be conflated with the structural move.
    - Root `README.md` rewritten as a monorepo overview (links to each app + the separate `gokan-dataset` repo); the prior gokan-srs-specific README content moved to `apps/gokan-srs/README.md` near-verbatim (just repointed its "Running locally" commands at the workspace root).
    - `gokan-dataset` (the dataset repo) and `gokan-dev` (the GitHub org both this repo and `gokan-dataset` now live under) remain **separate repos** - only the static-pages app was folded in here, since it and `gokan-srs` share no code (different stacks even) and the monorepo benefit was purely CI/issue-tracking consolidation, which doesn't apply to the dataset's independent release/licensing cycle.

- **[2026-07-24]**:
  - **Fix - reading quiz interrupting a meaning-quiz batch (and vice versa)**: `getNextVocabToStudy` prioritized ALL actionable readings over meanings unconditionally, recomputed live on every state change (`selectNextView` reruns whenever `state.progress` changes, i.e. after every answer). If a reading item became actionable *while* the user was mid-way through a run of meaning quizzes - most commonly a `needsRetry.reading` flag flipping from an earlier wrong answer, or a review simply coming due - the very next card would silently switch to a reading quiz. Reported as: users, mentally still in "meaning mode" (especially on mobile, where the phase wasn't visually obvious), would type a meaning-style answer into the surprise reading quiz and take an avoidable SRS penalty.
    - **Fix - sticky quiz-type batching**: `getNextVocabToStudy(queue, settings, now, preferredType)` gained an optional `preferredType: QuizType` parameter. `selectNextView` (`quizSelectors.ts`) passes `state.currentQuizItem?.quizType` as this hint (added `currentQuizItem` to its state `Pick`). When the preferred type still has actionable work, it keeps being served ahead of the reading > meaning default priority; only once that type's pool is empty does selection fall through to the normal priority (and, from there, to new intros as before). `useQuizOrchestration`'s `nextView` memo now also depends on `state.currentQuizItem` so the hint updates promptly. Retries are still immediate within their own phase - a meaning retry mid-meaning-batch still interrupts other meaning items as before - only the *cross-phase* interruption is gone.
    - **New on-screen phase indicator**: added `QuizTypeIndicator` in `BaseQuizCard.tsx` (shared by `QuizCard` and `MeaningQuizCard`) - a small uppercase "Reading"/"Meaning" label with a `lucide-react` icon (`BookOpenText`/`Languages`) shown above the card content on every quiz card. Deliberately uncolored per the design system's "minimize colors" rule (icon + label carry the distinction, not a hue); addresses the same user report that a phase switch could go unnoticed at a glance, independent of the batching fix above.
    - Test coverage: `quizSelectors.test.ts` gained two regression tests - staying on the meaning batch when a reading retry becomes actionable mid-batch, and falling through to reading once the meaning batch is exhausted.
  - **`ignoreKnownKanjiRequirement` setting**: Generalized the "ignore known kanji" trade-off that `jlpt` order used to make unconditionally into an opt-in toggle (`UserSettings.ignoreKnownKanjiRequirement`, default `false`) shared across `frequency`/`kanji_coverage`/`jlpt`. Threaded through `SRSService.getNextCandidates` → `findCandidatesFrequency`/`findCandidatesKanjiCoverage`/`findCandidatesJLPT` (new `ignoreKnownKanji` param, replacing each hardcoded `entry.containedKanji.every(k => kanjiKnowledge.kanjiSet.has(k))` check with `ignoreKnownKanji || ...`) and `countLearnableVocabulary`'s matching branches, so the "more learnable vocab exists" count and the actual candidate-finder can't disagree. `findCandidatesJLPT`'s frequency-fallback filler (once the ~6.4k-word JLPT lists run dry) also honors it. Has no effect on `kklc` (gated by KKLC step, never checks the kanji set directly). Exposed in Settings for every order except `kklc`, next to the existing "Vocabulary order" picker.
    - **Follow-up same day**: initially `jlpt` was left always-unfiltered (matching its prior behavior) with the toggle only wired up for `frequency`/`kanji_coverage`. Revisited at the user's request: `jlpt` now defaults to kanji-filtered too, same as every other order, which is what makes the shared toggle actually useful for it - previously enabling it for `jlpt` would have been a no-op since that order already ignored kanji unconditionally. The toggle is now the *only* way to get the old "follow the official level list exactly, regardless of kanji known" behavior. Test coverage (`srs.service.test.ts`) split accordingly: default-filtered walk/count vs. toggle-enabled unfiltered walk/count, using a kanji-complete `allKnownKanjiKnowledge` fixture for tests that aren't about the filter itself.
  - **Fix - permanent "More vocab available after this session" noise**: `SessionProgress`'s `WaitingNote` showed a fallback message whenever `moreNew` (`hasMoreLearnable`, "does any learnable vocab exist anywhere in the ~36k-word dataset") was true and no reviews were concretely `waiting`. Given the dataset's size, `moreNew` is true for virtually every user indefinitely, so the fallback text was permanent noise rather than a meaningful signal - confirmed with the user rather than assumed. Fixed by dropping the fallback entirely: the note now only renders when `waiting > 0` (a concrete count of vocab due after this session), with `moreNew` still used solely as the "+" suffix on that count (`waiting` items are due for certain; `moreNew` means there could be even more beyond that).

- **[2026-07-22]**:
  - **JLPT Coverage chart + JLPT learning order**: Two features off the `jlptLevel` data added on `[2026-07-21]`, both needing a level→vocab index that didn't exist yet.
    - **New index** (`scripts/build-jlpt-index.ts` → `public/data/compiled/index/jlpt.json`): JLPT level (1..5) → `{id, containedKanji}[]`, frequency-sorted within each level. Entries mirror `FrequencyIndex`'s shape so candidate-finding can share the same filtering. 6,423 of 35,814 compiled vocab carry a level (N5 461, N4 448, N3 1475, N2 1343, N1 2696). Built as a **separate post-pass over the compiled vocab files**, chained into `build:data` after `build-data.ts` and runnable alone as `build:jlpt` - folding it into `build-data.ts` would mean re-running Kuromoji tokenization over the whole corpus to reshape an index.
    - **`JlptCoverageChart`** (Statistics screen): five stacked bars, N5 at top, each splitting that level's total into mastered / in-progress / untouched. Mastery is `isVocabFullyMastered` from `scheduling.ts` (same definition the scheduler and `SmartVocabList` use, not a reimplementation). Follows the dataviz method: legend + direct `n / total` labels so identity never rests on color, per-bar hover tooltip, `<details>` table view, hero figure, 2px surface gap between stacked segments, CSS custom properties (`bg-accent`) rather than light-mode-only hexes so dark mode works. Single hue in two steps rather than two hues - the segments are ordinal stages of one thing, and the design system reserves the secondary accent for errors.
    - **New `'jlpt'` learning order** (`LearningOrder`, `findCandidatesJLPT`): walks N5 → N1, frequency-ordered within a level. **Deliberately not filtered by known kanji** - the only order that isn't. Chosen explicitly: the mode exists so a user studying for a specific sitting covers that level's published list exactly, which means it can introduce a word whose kanji they've never studied. This is a real departure from the app's "Kanji-Aware Learning" goal and is scoped to this one order; the Settings/Setup option is labelled "ignores known kanji" so the trade-off is visible at the point of choice.
    - **Exhaustion fallback**: the JLPT lists cover ~6.4k of ~36k words, so `findCandidatesJLPT` falls back to `findCandidatesFrequency` (kanji-filtered as normal) once drained, rather than parking the user on the "exhausted" screen after N1. `countLearnableVocabulary` mirrors this but delegates **only when the JLPT count is 0** - the two pools overlap heavily, so summing them would inflate the count.

- **[2026-07-21]**:
  - **JLPT Levels + Kanji Detail Page**: Added JLPT level (N1-N5) as a descriptive attribute on both kanji and vocabulary, using the [Bluskyo/JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary) dataset, plus a new Kanji Detail Page with bidirectional vocab ↔ kanji navigation.
    - **Data**: `data/raw/jlpt-kanji.json` (flat character → N-number map) and `data/raw/jlpt-vocab.json` (written form → reading/level pairs, since a word can carry different levels per reading) added as new raw inputs, tracked via the existing `data/raw/**` Git LFS glob.
    - **Kanji**: `build-kanji.ts` now populates the previously-unused `Kanji.steps.jlpt` field directly from the dataset's N-number. Since the outer loop iterates KKLC chapters (not the JLPT file), a kanji outside the KKLC set never gets a `Kanji` object at all - JLPT levels are only visible for kanji already in the app's KKLC-driven kanji set, by design.
    - **Vocabulary**: added `Vocabulary.jlptLevel?: number` (top-level, not nested under `progression` - it's purely descriptive/display, not a learning-order input like `kklcStep`). `build-data.ts` matches each word's written form against the JLPT vocab map, preferring the entry whose reading matches the word's primary reading, else falling back to the dataset's first entry, and assigns this before the homograph-merge pass (so a merged entry keeps whichever homograph became the base's own level, if any - a lower-frequency absorbed homograph's level is not inherited). Most vocab (JMDict has ~40k+ entries vs. the JLPT dataset's ~8k) will have no `jlptLevel`, and that's expected.
    - **Reverse kanji→vocab index**: `build-data.ts` now also emits `data/compiled/index/kanji-vocab.json`, mapping each kanji character to the vocab IDs containing it, sorted by frequency rank so capped/expandable UI lists surface common words first.
    - **New Kanji Detail Page** (`pages/kanji/KanjiDetailScreen.tsx`, route `/kanji/:character`): kanji glyph, JLPT chip, KKLC step, frequency, and a `KanjiVocabListCard` (mirrors `VocabRelationshipsCard`'s capped/expandable list pattern) of vocabulary containing it, sourced from the new reverse index.
    - **Cross-linking**: `VocabDetailScreen` gained a small "Kanji" card listing each of a word's `containedKanji` as clickable chips navigating to the new kanji page; the kanji page's vocab list links back to `/vocab/:id` - completing the vocab ↔ kanji loop.
    - **`JlptChip`** (`components/JlptChip.tsx`): new small presentational component (bordered pill, `N{level}`, reuses the existing accent color rather than a per-level color scheme, per the design system's "minimize colors" rule) - dropped into `QuizCard`, `MeaningQuizCard`, `VocabIntroCard`, `VocabDetailScreen`, and `KanjiDetailScreen` wherever a level is present.
    - **`VocabularyService`** gained `loadKanjiIndex()`/`loadKanji(character)`/`loadKanjiVocabIndex()`, following the same `fetchJson` + in-memory-cache pattern as the existing index loaders.
  - **Session-progress counter rework** (`components/SessionProgress.tsx`, `context/quiz/quizSelectors.ts`, new `session` slice in `quizReducer.ts`): the `done / total` counter's **total shrank as the user worked**. Root cause: `selectSessionStats` derived `total = done + liveDueReviews`. A wrong answer pushes the item's due date ~12h out, so it drops out of `liveDueReviews`, but `done` only counts non-wrong answers - so the denominator ticked *down* on every wrong answer, and the pending retry (tracked by `needsRetry`, not a due date) was never re-counted.
    - **Fix - a frozen session task set**: added a `session: { committed: TaskKey[] } | null` slice. `TaskKey` is `` `${vocabId}:${quizType}` ``. `committed` is snapshotted once when a study session begins (`collectActionableTaskKeys`, the actionable-now tasks) via a `SESSION_START` effect in `useQuizOrchestration`, and cleared on `SESSION_END` when the user hits waiting/exhausted. `selectSessionStats(state, hasMoreLearnable, now)` now returns `{ done, total, retriesPending, waiting, moreNew }` computed against that fixed set: `total` never moves for the life of the session; `done` = committed tasks no longer actionable; the counter can only climb.
    - **Retries highlighted**: `retriesPending` = committed tasks currently awaiting a redo (wrong this session). Rendered as a highlighted `+N` appended to the total and added to the progress-bar denominator, so the bar can't read 100% while redos remain.
    - **New work kept out of the total**: reviews that come due *after* the session started aren't folded into the total (which caused part of the instability); they surface as a separate "`n+` vocab waiting after this session" line (`waiting` = distinct non-committed due vocab, `moreNew` = `hasMoreLearnable` supplies the `+`). A word the user explicitly chooses to **Learn** *does* join the session (its `reading` task is appended to `committed` in `VOCAB_INTRO_CHOICE`), so actively learning new words grows the total by intent rather than surprise; its staggered (+12h) meaning is left to surface as waiting.
    - **Shared actionability predicates**: extracted `isReadingActionable` / `isMeaningActionable` in `srs.utils.ts` (single source of truth) and refactored `getNextVocabToStudy` onto them, so the counter and the actual queue-selection can never disagree about what counts as "a quiz due now".
    - `sessionStats` is computed in `useQuizOrchestration` (it needs `hasMoreLearnable`) and exposed on `QuizContextValue`; `SessionProgress` reads it from context instead of recomputing. Note: the new selector tests exposed a pre-existing test-hygiene hazard - `DEFAULT_VOCABULARY_PROGRESS` holds shared nested `reading`/`meaning` objects that other test files mutate - so the session-stats tests build fully self-contained vocab entries.

- **[2026-07-20]**:
  - **Knowledge Curve** (`utils/knowledge.utils.ts`, `pages/stats/components/KnowledgeCurveChart.tsx`): New cumulative graph on the Statistics screen answering "am I still climbing or have I plateaued", distinct from the existing Daily Progression chart (which counts review *activity*, not knowledge *held*).
    - **Knowledge points** are an internal accounting unit, deliberately **not** surfaced as a user-facing score. One SRS entry (reading OR meaning) at full mastery is worth `KNOWLEDGE_POINTS_PER_ENTRY` (100), so a word mastered in both directions is worth 200. `entryKnowledgePoints` derives this from the existing `calculateMasteryPercentage` (which spans 0..200 across its two visual loops) normalised to 0..100 - deliberately reusing the one mastery curve rather than introducing a second, divergent notion of "how far along is this item".
    - **Historical reconstruction**: `ReviewLog` stores `interval`, not `memoryStrength`, so `strengthFromLog` inverts the interval formula from `calculateNextState` (`interval = strength * lnTarget * modifiers`). The result-specific post-processing (`wrong` x0.3, `minor_error` x0.7) is undone **exactly**, since `result` is logged; the current frequency modifier is divided out. Two approximations remain and are documented in-code: the adaptive interval modifier at review time isn't logged, and where a floor clamped the interval the pre-clamp value is unrecoverable. Both distort only the bottom of the curve.
    - **Known limitation**: `SRSEntry.history` is capped at the last 20 reviews (`calculateNextState` does `.slice(-20)`), so a heavily-reviewed item's earliest logs no longer exist. Such an entry's timeline starts at whatever it was worth 20 reviews ago rather than at zero, slightly front-loading knowledge for mature words in the oldest part of a long window. Accepted: it affects only near-mastered words, and the trend the graph exists to show is unaffected.
    - Entries with **no history** (a vocab skipped at intro as "already known", set straight to max strength) are credited in full at their `introductionAt`. An introduced-but-unreviewed item sits at `minMemoryStrength`, which is worth 0 points, so it correctly doesn't move the curve.
    - **Performance**: the curve is built by accumulating per-entry point *changes* into the day they occurred and prefix-summing, rather than evaluating every entry on every day. Events predating the window collapse into a single starting baseline (so `gained` reports only what was earned *inside* the window, while the curve still starts at the right height). Window starts step back by calendar days, not `N * DAY_MS`, so a DST boundary can't produce a window one day too long.
    - Chart follows the dataviz method: single cumulative series (no legend needed), solid hairline grid, crosshair + tooltip hover layer, a range filter (30d / 90d / 1y / All) above the plot, a direct endpoint label and hero figure so values are readable without hovering, and a `<details>` table view aggregated to ~8 rows. Colors are the CSS custom properties (`var(--accent)`, `var(--divider)`) rather than the light-mode-only `THEME` hexes, so dark mode works.
  - **Fix - changing known kanji didn't recalculate the next optimal vocab**: editing the kanji count/set on the Profile screen left the pre-fetched `introCandidates` buffer (3 items) in place, so the quiz kept offering vocabulary chosen for the *old* kanji set. Changing the learning order already invalidated this buffer (`SAVE_SETTINGS`), but `UPDATE_KANJI_KNOWLEDGE` did not - the same bug class as the `[2026-05-13]` intro-candidates entry. Fixed by clearing `introCandidates` (and the stale `nextKanjiToLearn` prompt) when the knowledge actually changed. The reducer compares content (method, step, kanji-set membership) and returns state **unchanged** on an identical payload, because `KanjiKnowledgeEditor` fires `onChange` on mount too.
  - **Fix - mastered vocabulary now hidden by default in the vocabulary list** (`SmartVocabList`): fully-mastered items are the ones the user is done with, and they dominate the list for anyone with real history. They're now filtered out by default via `isVocabFullyMastered` (from `scheduling.ts`, so the definition matches the scheduler's rather than being reimplemented), with a "Show mastered (N)" checkbox to bring them back. The count stays visible so it never looks like data went missing, the preference persists alongside the other list controls in `sessionStorage`, and the empty state explains itself when everything matching is hidden.

- **[2026-07-19]**:
  - **Infinite auto-upload sync loop fix** (`sync-loop-investigation.md`): When logged into Google Drive, the auto-upload effect fired continuously. Three independent defects each sustained the loop, all fixed:
    - **Content oscillation (root cause)**: `migration.service.ts`'s unconditional `nextReviewAt` recompute called `vocabNextReviewAt(item)` **without settings** on every load, and `isMeaningQuizEnabled(undefined)` defaults to `true`. With `enableMeaningQuiz: false`, every localStorage/Drive hydration stamped the meaning-based due date while every merge (`mergeVocabProgress`, settings-aware) stamped the reading-based date — so each load→merge round trip genuinely changed the data. Fix: settings are now threaded through `migrateUserProgress(progress, settings?)` → `migrateAndHydrateProgress(parsed, settings?)` and supplied at all call sites (`StorageService.loadProgress` reads its own stored settings; `GoogleDriveSync.parseEnvelope`/`getLocalProgress` pass the envelope's/local settings).
    - **Reconcile could never settle**: `mergeProgress` bumps `_sync.version` on every merge even when nothing changed, so the reconcile effect's `diskVersion <= liveVersion` guard never held after a routine sync, and every cycle dispatched `RECONCILE_REMOTE` with fresh (content-identical) progress/settings objects. Fix: the reconcile effect now also compares **content** (via `progressUploadSignature` + `stableStringify` of settings) and skips the dispatch when the reconciled result equals live state.
    - **Unstable upload-effect dependencies**: `uploadProgress` was recreated on every `GoogleDriveProvider` render (and the provider re-renders on every sync via `isUploading`/`lastBackgroundMergeTime`), and the effect also depended on the `state.settings` reference. Fix: `uploadProgress` is now a stable `useCallback([])` reading `syncService`/`isDownloading` through refs, and the effect depends on a `settingsSignature` content string instead of the settings object.
    - **Canonical signatures**: `progressUploadSignature` was `JSON.stringify`-key-order-sensitive — hydrated-from-storage objects and merge-produced objects list keys in different orders, so equal content produced different signatures. Added `stableStringify` (recursive key sort; Dates→ISO, Sets→sorted arrays) in `progressSerialization.ts` and rebuilt the signature on it.
    - Note: the doc's proposed fixes (independent settings versioning, settings normalization at boundaries) were **not** the root cause — settings normalization already existed (`loadSettings`/`parseEnvelope` spread `DEFAULT_SETTINGS`), and the flip came from the settings-less migration recompute, not from a partial settings blob. The version-conflation issue in `mergeSettings` call sites is real but benign for this bug; it remains a candidate for a future cleanup.
  - **Quiz-card flicker fix (deterministic queue pick)**: on app start and after each answer, several different vocab cards flashed for ~1s before the next card settled. Cause: `getNextVocabToStudy` picked from the due pool with `Math.random()`, but it runs inside `selectNextView` — recomputed on every state change, with `currentVocab` among the memo deps. Each recompute rolled a different card; loading that card changed `currentVocab`, triggering the next recompute/roll, cascading until two consecutive rolls happened to agree. Fixed by (1) replacing `pickRandom` with `pickStable` in `srs.utils.ts` — a pick seeded by a hash of the pool's own state (vocabIds + totalReviews + lastReviewedAt + needsRetry flags), so the same pool always yields the same card while every answer still naturally reshuffles (the anti-interference intent is preserved as a per-answer reshuffle instead of a per-render one); and (2) a guard in the load-vocab effect that skips `LOAD_VOCAB_START` when exactly the requested vocab/quizType/quizMode is already loaded (selectNextView returns a fresh `queueItem` object per recompute, so the effect dep alone can't detect "same card").
  - **Sync fast-forward + honest reconcile signal** (follow-up to the loop fix): after the loop was gone, each answer still caused one reconcile pass that reloaded the active quiz card. Cause: every background upload ran a full merge against the remote file — which is almost always just this client's own previous write — and a **self-merge is not a no-op** (`mergeEntry`'s `max()` safety net resurrects the pre-answer `memoryStrength` after a failed review, and `applyAnswer`'s all-false `needsRetry` object gets collapsed to `undefined`), so the merged result always differed from live state and `RECONCILE_REMOTE` fired. Two changes:
    - `GoogleDriveSync.sync()` now **fast-forwards**: it remembers the content signatures (`progressUploadSignature`/`stableStringify`) of the envelope it last wrote; when the remote file still matches them, local state is a strict descendant and the merge is skipped entirely — local content is uploaded as-is with a version bump. Side benefit: a wrong answer's SRS penalty is no longer partially undone by the routine sync that follows it (the `max()` resurrection). Full merge still runs whenever remote content genuinely diverges (another device wrote).
    - `sync()` returns a `SyncOutcome { envelope, pulledRemoteChanges }`, and `GoogleDriveContext` bumps `lastBackgroundMergeTime` **only when `pulledRemoteChanges` is true** — matching that field's documented meaning ("bumped after a background sync that pulled in remote changes"). Routine answer uploads therefore never trigger the reconcile effect at all; the quiz session is only disturbed when another device's changes actually arrive.
    - Cleanup: the redundant post-merge content-signature guard in the reconcile effect was removed (the `pulledRemoteChanges` gate + version guard are sufficient; three overlapping gates on one decision is how the original drift accumulated). A `console.info` diagnostic fires when fast-forward misses despite a prior write — if it appears after every answer, suspect a broken serialize→parse round trip. Deeper structural follow-ups (derive `nextReviewAt`/`stage` at read time instead of persisting them, SyncManager extraction out of React, Drive revision-id ancestry, `mergeEntry` max() policy) are documented in `FUTURE_REFACTORS.md`.

- **[2026-07-18]**:
  - **Architecture Remediation** (full audit in `ARCHITECTURE_AUDIT.md`): The orchestration layer around the SRS formula (state management, sync, migration) had accumulated three uncoordinated sources of truth for scheduling/session-state, a dead subsystem, and real data-loss vectors in the Drive sync path. Fixed end-to-end in phases:
    - **Repo hygiene**: Deleted abandoned `apps/` monorepo scaffolding and the duplicate `vite.config.js` (Vite silently prioritized the untracked `.js` over `.ts`, so `.ts` edits were being ignored).
    - **Data safety** (`backup.service.ts`, `progressSerialization.ts`): Added a write-once local backup snapshot before any new migration touches stored data, and unified `storage.service.ts`/Drive sync onto one shared (de)serialization module.
    - **Scheduling unification** (`scheduling.ts`): `nextReviewAt`/`stage` are now always **derived**, never hand-synced independently, fixing a latent bug where disabling meaning quizzes could leave a vocab stuck unable to graduate. `needsRetry` became per-quiz-type (`{reading?, meaning?}`) instead of one shared boolean. Removed a redundant double-call to `SRSService.applyAnswer` per answer.
    - **State layer modular split**: `QuizContext.tsx` (1017 lines, one file) split into `quizReducer.ts` (pure), `quizSelectors.ts` (`selectNextView` - one function replacing three previously-independent decision points), `useQuizOrchestration.ts` (effects + actions), and a thin `QuizProvider.tsx`. Deleted the entire dead `sessionQueue`/`sessionBuiltAt`/`BUILD_SESSION_QUEUE`/`SHIFT_SESSION_QUEUE`/`APPEND_TO_SESSION_QUEUE` subsystem - nothing ever read it.
    - **Sync redesign** (`services/sync/`): Split into `driveClient.ts` (HTTP), `mergeProgress.ts` (pure per-entry merge - reading/meaning merge independently so one device's reading review can't clobber another's meaning review), and `googleDriveSync.ts` (orchestrator adding optimistic-concurrency retry, duplicate-file reconciliation, and a write-once remote backup). Background merges now reconcile into live React state via `RECONCILE_REMOTE` instead of being silently overwritten by the next local action; an expired token now surfaces visibly (`syncPaused`) instead of failing silently.
    - **Migration correctness**: Introduced a two-tier version scheme (`SYNC_MIGRATION_VERSION` vs `CURRENT_FORMAT_VERSION`) - the synchronous pass previously stamped the terminal version directly, pre-empting the async homograph-merge migration forever after a single load.
    - **UI cleanup**: `QuizScreen` now switches exhaustively (compile-time-checked) on `sessionState`; the mastery-percentage formula (`MasteryRing` vs `srs.utils.ts`), reading-list formatting, POS-tag dedup, and "+N more definitions" logic were each de-duplicated into shared helpers; `MeaningQuizCard` reads `quizMode` from state instead of guessing it from sentence presence; `BaseQuizCard`'s four uncoordinated (mostly uncancelled) focus timers were consolidated into one effect; the redundant double-mounted `ResponsiveProvider` was removed; a real settings bug was found and fixed where `enableGeminiContext` (the master AI toggle) was never actually checked by the AI-triggering code.
    - **Tests**: Added coverage for the previously-untested orchestration layer (reducer, selectors, scheduling, merge, migration golden round-trip) - this layer had zero tests before this work despite being where the bugs lived.

- **[2026-03-27]**:
  - **Configurable Context Quiz Threshold**:
    - Added `MeaningContextThreshold` type (`'early' | 'normal' | 'late'`) to `user.model.ts` and `UserSettings`.
    - Replaced the hardcoded `sentenceQuizMasteryThreshold: 30` constant with a `meaningContextThresholds` map (`early: 30, normal: 50, late: 70`) in `constants.ts`.
    - Updated `getNextVocabToStudy` in `srs.utils.ts` to resolve the active threshold from `settings.meaningContextThreshold` (defaulting to `'normal'`).
    - Added a 3-option selector (Early / Normal / Late) in `Settings.tsx` under the "Learning preferences" section, only visible when meaning quizzes are enabled.
    - Default changed from 30% to 50% (normal) — existing users without a saved setting will also use 50%.

- **[2026-03-20]**:
  - **Refined Kanji Coverage Algorithm**:
    - Introduced a frequency penalty to the Kanji Coverage scoring mechanism to prevent the selection of obscure or overly complex compound words.
    - New Scoring Formula: `Score = (Coverage * 2500) - Frequency Rank`.
    - This ensures common, useful words are prioritized even if they cover fewer new kanji than a very rare compound.
    - Updated unit tests to verify the balance between coverage and frequency.

- **[2026-03-18]**:
  - **New Learning Order (`kanji_coverage`)**:
    - Introduced a new optimal vocabulary learning order based on the Set Cover problem. It dynamically prioritizes learning words that cover known kanji that don't yet have any associated learned vocabulary.
    - Added `kanjiCoverageTarget` to `UserSettings` to control how many words per kanji to target before falling back to frequency.
    - Promoted to the default setup order as it is the fastest, most efficient learning path.

- **[2026-03-11]**:
  - **Meaning Quiz Mode Split (`QuizMode`)**:
    - Introduced `QuizMode` type (`'base' | 'context'`) in `srs.utils.ts`. `QuizType` (reading/meaning) is preserved as-is; `QuizMode` is a supplementary modifier.
    - Added `quizMode` field to `QuizItem` and `PendingQuizItem` in `QuizContext.tsx`. Reading quizzes always use `'base'`. Meaning quizzes dynamically compute the mode in `getNextVocabToStudy` based on the item's current mastery percentage:
      - **`base` mode**: Word-alone quiz using strict definition list evaluation. Used while `meaning.memoryStrength` visual mastery is below **30%**.
      - **`context` mode**: Sentence quiz using AI evaluation first (when API key is configured). Unlocked once mastery ≥ 30%. Falls back to strict evaluation on AI network errors.
    - Added `alwaysUseAiForMeaningContext` to `UserSettings` (default `true`). When `true`, the AI validates all answers in context mode — not just incorrect ones. When `false`, reverts to the previous behavior (only validates wrong/minor_error answers).
    - Updated `SRSService.applyAnswer` to take `quizMode` and dynamically set `expectedLatency` for the SRS latency multiplier: `reading` = 10s, `meaning_base` = 10s, `meaning_context` = 15s (extra reading time for sentences).
    - Added `quizProperties` map and `sentenceQuizMasteryThreshold: 30` constant to `CONSTANTS.srs`.
    - Updated all `SRSService.applyAnswer` call sites in tests to pass the new `quizMode` argument.

- **[2026-03-10]**:
  - **Alternative Vocabulary Writings**:
    - Updated `Vocabulary` model and `build-data.ts` to capture and retain alternative kanji writings from JMDict instead of discarding them.
    - Updated `SentenceTokenizer` indexing so that overlapping sentence tokens containing an alternative kanji writing correctly resolve back to their parent vocabulary IDs (e.g., `敵同士` now matches to `仇同士`'s ID: 1227450).
    - Updated `VocabDetailScreen` to display these alternative kanji forms below the primary kanji, providing users with complete orthographic context.

- **[2026-03-06]**:
  - **Learning Frequency Setting**:
    - Added a `learningFrequency` option (`high`, `medium`, `low`) to `UserSettings` to allow users to scale their review rhythm.
    - Updated `SRSService` interval calculation to apply a `frequencyModifier` (`1.0`, `1.5`, or `2.0`), which directly scales the computed Spaced Repetition interval.
    - Added UI controls in the Settings screen to allow the user to select their desired frequency.

- **[2026-03-05]**:
  - **Sentence Tokenizer Overlap Fix**:
    - Fixed a bug in `scripts/build-data.ts` where overlapping vocabulary matches in a sentence (e.g., `風が強い` and `強いです` overlapping on `強い`) were both incorrectly retained.
    - Updated the greedy matching algorithm to use strict overlap checking (`match.start < acceptedEnd && matchEnd > accepted.match.start`) instead of only filtering out fully enclosed matches.
    - Added vocabulary base length as a tie-breaker when sorting matched tokens (`b.term.length - a.term.length`) so that longer compound expressions correctly take precedence over their component parts.

- **[2026-03-03]**:
  - **Vocabulary Parent Relationships**:
    - Added a `parents` string array to the `Vocabulary` model representing the inverse relationship of `components`.
    - Modified `scripts/build-data.ts` to compute components efficiently using an inverted index and subsequently map parents.
    - Created `VocabRelationshipsCard.tsx` on the `VocabDetailScreen` to display interactive "Consists of (Components)" and "Used in (Derived Words)" vocabulary lists.
  - **Multiple Sentence Occurrences**:
    - Enhanced `SentenceTokenizer` (`src/utils/tokenizer.ts`) and `scripts/build-data.ts` to identify and retain all occurrences of a vocabulary word within a single sentence instead of just the first.
    - Converted the `matches` dictionary values in the `Sentence` model from a single object to an array of match objects.
    - Updated `InteractiveSentence.tsx` to handle the array type and properly segment/highlight the text multiple times when the target word appears repeatedly.
  - **Build Data Fixes**:
    - Removed `build-vocabulary.ts` and `build-sentences.ts` from being run natively, recognizing that `build-data.ts` builds the final output unified schema. Ported all feature additions into `build-data.ts`.

- **[2026-02-28]**:
  - **Data Build Pipeline Fix**:
    - **Vocabulary Dropping Bug**: Words with kanji outside the KKLC index (e.g. `顰蹙`) were silently dropped by two back-to-back filters in `build-data.ts`: the JPDB frequency requirement (`if (!jpdbEntry?.kanjiRank) continue`) and the KKLC step check (using `Math.max(...map(k => kklcMap.get(k) ?? 0))` which defaulted to 0 for unknown kanji). **Fix**: vocabulary without JPDB entry now receive a fallback `kanjiRank: 999999` (low priority, still included). Words whose kanji are outside the KKLC index now receive `kklcStep = 99999` (reachable via frequency sort, never via KKLC path). Applied to both `build-data.ts` and `build-vocabulary.ts`.
    - **SentenceTokenizer (`src/utils/tokenizer.ts`)**: Created a new `SentenceTokenizer` class using Kuromoji (MeCab port) for morphologically-accurate sentence parsing. Replaces the handmade `Deinflector` in `build-data.ts`. Key features: (1) Kuromoji `basic_form` matching correctly handles conjugated single words; (2) sliding window of up to 5 tokens catches compound expressions (`顰蹙を買う`) split across tokens; (3) `かい`→`買う` heuristic handles the 連用形 (continuative form) for `買う`-type expressions. This guarantees `通り` (street) never falsely matches `通る` (to pass).
    - **Result**: Dataset grew from 34,948 to 36,795 vocab files. `1574360.json` (顰蹙) now exists in the compiled output. Sentence `75803` is correctly linked to it.
  - **Kuromoji Test Suite** (`scripts/kuromoji.test.ts`): Added integration tests for the `SentenceTokenizer` to prevent regressions on: `通り`/`通る` false-positive prevention, and `顰蹙を買う` compound detection via conjugated form `をかい`.
  - **Mobile Cache Fix**: Updated `.github/workflows/deploy.yml` to invalidate `/data/compiled/*` on CloudFront alongside entry points. This ensures devices don't hold onto stale sentence or index files that point to deprecated vocab IDs.
  - **AI Minor Errors**: Modified `LLMService.validateMeaningContext` to allow Gemini to return a `minor_error` instead of a strict boolean `correct`. If the user is conceptually close but misses nuance, this allows the SRS algorithm to apply a partial credit penalty rather than a complete failure reset.
  - **Vocab History Graph**: Created a new `VocabHistoryGraph.tsx` SVG component and embedded it in the `VocabDetailScreen.tsx`. It plots the `interval` length (as a proxy for memory strength) over time, giving users a visual representation of their learning curve for both Reading and Meaning.
  - **Stats Bucket Fix**: Refactored `ReviewForecast.tsx` array bucketing. Split `Today` into independent `Due Now` and `Later Today` logic blocks to prevent +12hr staggered meaning quizzes from visually inflating the immediate to-do counter.
  - **Session Orchestration**: Refactored `QuizContext.tsx` to utilize a frozen `sessionQueue` model instead of dynamically shifting `nextDue` on every render.
    - Added `BUILD_SESSION_QUEUE` and `SHIFT_SESSION_QUEUE` actions.
    - When a user gets a card wrong, it is explicitly `APPEND`ed to a random position in the remaining `sessionQueue`.
    - This ensures that items becoming due *while* the user is studying do not interrupt the active review session, waiting until the session drains completely.

- **[2026-02-25]**:
  - **Infinite Fetch Loop Fix**: Resolved an issue where `advanceQueue` entered an infinite loop masking a loading error.
    - If the user's browser cached an old `frequency.json` containing deprecated IDs (removed previously by the Homograph Vocabulary Merge), the SPA fallback returned `index.html` (200 OK) for the missing `.json` files.
    - This caused a silent `SyntaxError` catch during `advanceQueue`, which resulted in an empty candidate list dispatch. The component continuously retried, fetching hundreds of times.
    - **Fix 1**: Added a cache-buster `?v=${Date.now()}` to `loadFrequencyIndex` and `loadKKLCIndex` in `vocabulary.service.ts` to ensure users always receive the unified data.
    - **Fix 2**: Added a generic safeguard in `QuizContext.tsx` `advanceQueue`: if candidate IDs exist but 100% of them fail to load, immediately abort and fire `LOAD_VOCAB_ERROR` to cleanly break out to the System Error screen rather than silently retrying.

- **[2026-02-22]**:
  - **Homograph Vocabulary Merge**: Unified JMDict duplicate entries sharing identical kanji into single Robust entries.
    - Updated `Vocabulary` models to support `mergedVocabs` containing original source info.
    - Updated `build-data.ts` to identify and collapse duplicates at build-time, preserving their respective readings and tagging them accurately using `appliesToReadings`.
    - Eliminated duplicate quiz sessions natively at the data level.
  - **V5 Progress Migration**: Handled user progress migration to the new schema.
    - Output `merged-map.json` linking removed duplicated ids to the unified base ID.
    - Upgraded `MigrationService.migrateMergedVocabsAsync` to Version 5.
    - Safely merges `history`, max `memoryStrength`, and reassigns IDs dynamically for active users without data loss.

- **[2026-02-21]**:
  - **Duplicate Quizzes Fix**: Resolved an issue where users received reading and meaning quizzes for the same vocabulary in the exact same session, causing a frustrating duplicate test experience.
    - Updated `applyVocabIntroChoice` to stagger the initial `meaning.dueDate` by +12 hours instead of scheduling both for `now`.
    - Updated `applyAnswer` to push `meaning.dueDate` forward by +12 hours if a user successfully answers a reading quiz and the meaning quiz is also due or about to be due.
    - This creates a natural Space Staggering between Reading and Meaning tests.
    - Updated `srs.service.test.ts` to reflect the 12-hour offset logic.

- **[2026-02-20]**:
  - **Dev Server Optimization**: Added `server.watch.ignored: ['**/public/data/compiled', '**/public/data/compiled/**']` to `vite.config.ts` to prevent Vite's file watcher (chokidar) from actively traversing the 50,000+ generated JSON files. Added `@source` directives in `index.css` to prevent Tailwind CSS v4 from scanning the dataset. These fixes resolve the massive 2-minute delay on the initial dev server request.
  - **Production Build Fix**: Migrated the compiled dataset (`vocab`, `sentences`, `index`) to the standard `public/data/compiled` directory. By doing this, Vite naturally copies the dataset exactly as-is to `dist/` during the production build. This allows the application to cleanly use `fetch('/data/compiled/...')` without tracking files in `import()`, retaining fast dev server startups and skipping the need for custom post-build copy scripts or buggy plugins. `package.json` build scripts were updated accordingly.

- **[2026-02-17]**:
  - **Sync Logic Fixes**:
    - **Conflict Resolution**: Changed strategy for `KanjiKnowledge` merging. When local and remote versions match, **Local** state is now authoritative to preserve deletions.
    - **Race Condition Fix (Optimistic Versioning)**: Implemented `latestLocalVersion` tracking in `GoogleDriveSync`. This detects when a background upload is triggered with stale React state metadata (but fresh content) and "patches" the version number to ensure it wins the sync conflict against the previous upload. This fixes the issue where rapid settings changes (e.g. Count then Set) were reverting each other.

- **[2026-02-16]**:
  - **Meaning Quiz Implementation**: Implemented Sentence Meaning Cloze quiz logic
    - Updated `SRSService.evaluateMeaning` with fuzzy matching (Levenshtein) and stop-word stripping
    - Added `Deinflector` utility for conjugation-aware sentence matching
    - Updated `Sentence` model with `matches` metadata for highlighting
    - Updated `MeaningQuizCard` to display highlighted target vocabulary in context
    - **Bug Fixes**:
        - Fixed missing Meaning Quizzes by initializing `reading.dueDate` and `meaning.dueDate` in `applyVocabIntroChoice`.
        - Fixed infinite Intro Loop by ensuring `newLearnedToday` stats are incremented in `VOCAB_INTRO_CHOICE` reducer.
        - Fixed `VocabIntroCard` form submission bug that caused page reloads on Learn/Skip.
        - Fixed logic error in `VOCAB_INTRO_CHOICE` reducer that created duplicate learning queue entries.
    - **Quiz Grouping**: Updated `getNextVocabToStudy` priority to group all Reading Quizzes (including new items) before Meaning Quizzes. This ensures a smoother learning flow (Intro Batch -> Reading Batch -> Meaning Batch).
    - **Fuzzy Matching**: Improved `evaluateMeaning` to strip "to be" prefixes and prioritize the first dictionary match on ties. This fixes issues where "to see" would match "to seem" instead of "to be seen".
    - **Interactive Sentence**: Created `InteractiveSentence` component to render Japanese sentences with clickable vocabulary links. Integrated into `MeaningQuizCard` and `VocabDetailScreen`, replacing ad-hoc tokenization with pre-calculated matches from the build pipeline.
    - **Meaning Quiz UX**: Disabled auto-advance on correct answers. Enabled navigation to vocab details from sentence links. Updated question text to be more precise ("What is the original meaning of..."). Fixed issue where "Continue" button was hidden on success.
    - **Meaning Quiz Design**: Applied Design System typography (Source Serif 4) to Meaning Quiz questions. Implemented dynamic question text based on sentence availability.
    - **Optional Meaning Quiz**: Added `enableMeaningQuiz` setting to allow users to disable meaning quizzes if desired.

- **[2026-02-15]**:
  - **Sentence Data Integration**: Implemented `scripts/build-sentences.ts` to compile sentence dataset
    - Reads cached TSV/CSV files and performs greedy tokenization to link sentences to vocabulary
    - Generates ~4700 individual sentence files in `data/compiled/sentences/`
    - Defined `Sentence` and `SentenceSet` models in `src/models/sentence.model.ts`
    - Validated data integrity and structure

- **[2026-02-15]**:
  - **Sentence Data Integration**: Implemented `scripts/build-sentences.ts` to compile sentence dataset
    - Reads cached TSV/CSV files and performs greedy tokenization to link sentences to vocabulary
    - Generates ~4700 individual sentence files in `data/compiled/sentences/`
    - Defined `Sentence` and `SentenceSet` models in `src/models/sentence.model.ts`
    - Validated data integrity and structure
- **[2026-01-29]**:
  - **Data Migration System**: Implemented comprehensive migration from old `mastery` (0-100) to new `memoryStrength`/`interval` system
    - Created `migration.service.ts` with automatic format detection and conversion
    - Added `_formatVersion` field to `UserProgress` for migration tracking
    - Integrated migration into `storage.service.ts` loadProgress method
    - Created 10 comprehensive tests covering edge cases and real production data
    - Migration preserves all user progress, review schedules, and stats
    - Conversion formula: `memoryStrength = (mastery / 100) * maxMemoryStrength`
- **[2026-01-28]**: 
  - **Test Infrastructure**: Added comprehensive test suite with Vitest
    - Created `srs.service.test.ts` with 27 test cases covering SRS formula, error classification, and retry behavior
    - Created `build-vocabulary.test.ts` for data integrity validation
    - Integrated test stage into GitHub Actions CI/CD pipeline (tests must pass before deployment)
    - Fixed test bug where minor_error test was incorrectly passing string literal instead of using forcedResult parameter
  - **SRS Improvements**: Implemented **immediate retry mechanism** for wrong answers: Items with wrong answers get `needsRetry` flag and appear in current session
  - Retry items mixed with old reviews (Priority 1), one retry per wrong answer to prevent loops
  - SRS calculation unchanged - retry is a learning aid, not a review
  - Simplified buffered introduction to **stateless approach**: Changed batch size to 3, prioritize New Intros over First Reviews
  - Removed `introBatchCount` state tracking - buffering now emerges naturally from priority system
  - Flow: Introduce 3 vocab → Show 3 more intros (priority 2) → Show 6 first reviews (priority 3)
  - Refactored `getNextVocabToStudy` in `srs.utils.ts`: (Old Reviews + Retries) > New Intros > First Reviews
  - Moved auto-advance queue logic from `QuizScreen` to `QuizContext` for centralized queue management
  - Created comprehensive project documentation covering architecture, data models, services, state management, and workflows.
- **[2026-01-26]**: Documented SRS priority workflow and error handling policy.
- **[2026-01-22]**: Acknowledged new Design System. Refactoring visual feedback to match "Sober & Serious" tone.
- **[2026-05-13]**:
  - **Intro Candidates Invalidation on Settings Change**:
    - Fixed a bug where changing `preferredLearningOrder` or `kanjiCoverageTarget` in Settings did not refresh the displayed intro candidates until a full page reload (F5).
    - Root cause: `introCandidates` buffer (3 pre-fetched vocab items) was cached and never invalidated when order-affecting settings changed. `nextDue` kept returning the stale Priority 1 intro candidate.
    - Fix: `SAVE_SETTINGS` reducer now clears `introCandidates` when `preferredLearningOrder` or `kanjiCoverageTarget` differs from the previous value. This triggers a fresh `advanceQueue` on the next quiz page render, fetching candidates with the new settings.
  - **Add to Learning List Not Refreshing Queue**:
    - Fixed a bug where clicking "Add to Learning List" on VocabDetailScreen did not show the new vocab in the quiz flow until a page reload.
    - Root cause: The vocab was correctly added to `learningQueue` (as a first-review item with `nextReviewAt=now`) but `introCandidates` blocked it in `nextDue`'s Priority 1. Even after intro candidates were consumed, the vocab was invisible because it never entered the `introCandidates` display pipeline.
    - Fix: When `VOCAB_INTRO_CHOICE` adds a vocab that was NOT already in `introCandidates` (i.e., from detail page), the vocab is inserted into `introCandidates` at a random position. Since it already has `introductionAt` set, the QuizScreen shows it as a regular quiz card (not intro card). After the user answers, `UPDATE_AFTER_ANSWER` removes it from `introCandidates` to prevent looping.
- **[2026-04-10]**: Added new "Kanji Coverage" statistic to `StatsOverview`, showing the number of unique kanjis present in the user's learning vocabulary out of their total known kanjis.
