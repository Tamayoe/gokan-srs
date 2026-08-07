# CLAUDE Project Context

> [!IMPORTANT]
> **Keep this documentation updated.**
> This file serves as the long-term memory for AI agents working on Gokan SRS. When making functional changes, update the relevant sections to reflect the current state of the codebase.
>
> **⚠️ CRITICAL REQUIREMENT: ALWAYS UPDATE BOTH CLAUDE.md AND GEMINI.md ⚠️**
> 
> When you modify either CLAUDE.md or GEMINI.md, you MUST immediately update the other file with IDENTICAL changes.
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
8. [Build & Development](#build--development)
9. [Functional Workflows](#functional-workflows)
10. [Constants & Configuration](#constants--configuration)

---

## Project Overview

**Gokan SRS** (語感 - "sense of language") is a Japanese vocabulary learning application using Spaced Repetition System (SRS) algorithms. It's designed as a serious study instrument, not a gamified app.

This repo (`gokan-srs`) is a **monorepo** (Bun workspaces) hosting `apps/gokan-srs` (this app) and `apps/gokan-dictionary` (a companion SEO-crawlable static dictionary site, currently a placeholder skeleton - see [issue #19](https://github.com/gokan-dev/gokan-srs/issues/19)). Both live under the `gokan-dev` GitHub org, alongside the separate `gokan-dataset` repo (the open, CC BY-SA-licensed vocab/kanji/sentence dataset both apps consume). See the root [README.md](README.md) for the full ecosystem layout.

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
│   │   ├── dataset/                   # git submodule -> gokan-dataset (raw sources, build pipeline, compiled/ output - including grammar, see Grammar Dataset)
│   │   ├── public/                    # Static assets
│   │   │   └── data/compiled/         # NOT committed - synced from dataset/compiled/ at dev/build time (vocab, kanji, sentences, grammar)
│   │   ├── scripts/
│   │   │   └── sync-dataset.ts       # Copies dataset/compiled/ -> public/data/compiled/
│   │   ├── src/
│   │   │   ├── assets/               # Images, fonts
│   │   │   ├── commons/              # Shared constants
│   │   │   │   └── constants.ts      # App-wide configuration
│   │   │   ├── components/           # Reusable UI components
│   │   │   ├── hooks/                 # Reusable React hooks shared across pages
│   │   │   │   └── useQuizFocusManagement.ts # Submit/Continue focus management, shared by VocabBaseQuizCard and GrammarQuizCard
│   │   │   ├── context/              # React Context providers
│   │   │   │   ├── quiz/             # Quiz state machine (modular, see State Management) - also hosts the Grammar activity's parallel state
│   │   │   │   │   ├── quizReducer.ts          # Pure reducer (state + actions, no I/O) - QuizState is Vocab's state intersected with GrammarQuizState
│   │   │   │   │   ├── quizSelectors.ts        # selectNextView + derived selectors (vocab)
│   │   │   │   │   ├── useQuizOrchestration.ts # All effects + actions (I/O, sync, timers) - vocab
│   │   │   │   │   ├── grammarReducer.ts       # Grammar action types + pure reducer logic, delegated to from quizReducer
│   │   │   │   │   ├── grammarSelectors.ts     # selectNextGrammarView, computeBlankPlan + derived selectors (grammar)
│   │   │   │   │   ├── useGrammarOrchestration.ts # All effects + actions for the Grammar activity
│   │   │   │   │   └── QuizProvider.tsx        # Thin assembler exposing QuizContextValue (both activities)
│   │   │   │   ├── useQuiz.ts        # useQuiz() hook + QuizContext object
│   │   │   │   ├── GoogleDriveContext.tsx
│   │   │   │   ├── ThemeContext.tsx
│   │   │   │   ├── KanjiForm/        # Kanji knowledge form state
│   │   │   │   └── Responsive/       # Responsive utilities
│   │   │   ├── models/               # TypeScript interfaces
│   │   │   │   ├── vocabulary.model.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   ├── grammar.model.ts  # GrammarPoint/GrammarExample/GrammarProgress (see Core Data Models)
│   │   │   │   ├── data.model.ts     # External dataset DTOs
│   │   │   │   ├── index.model.ts
│   │   │   │   ├── state.model.ts
│   │   │   │   └── kanji.model.ts
│   │   │   ├── pages/                # Page components
│   │   │   │   ├── main/             # Activity hub (landing route '/') - activity cards + session recap
│   │   │   │   ├── quiz/             # Vocab study session screen, route '/quiz' (also hosts quizFormatting.ts helpers) - VocabQuizScreen, VocabQuizCard, VocabMeaningQuizCard, VocabBaseQuizCard
│   │   │   │   ├── grammar/          # Grammar study session screen, route '/grammar' (see Application Pages)
│   │   │   │   ├── setup/            # Initial setup wizard
│   │   │   │   ├── settings/         # App settings
│   │   │   │   ├── profile/          # User profile
│   │   │   │   ├── stats/            # Statistics screen + charts (see Application Pages)
│   │   │   │   └── about/            # About page
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── srs.service.ts    # SRS algorithm (formula only) - also the source of the reusable calculateNextState formula
│   │   │   │   ├── scheduling.ts     # Single source of truth for due-date/mastery derivation (vocab)
│   │   │   │   ├── vocabulary.service.ts
│   │   │   │   ├── grammar.service.ts       # Loads compiled grammar data (public/data/compiled/grammar/, see Grammar Dataset)
│   │   │   │   ├── grammarScheduling.ts     # scheduling.ts's equivalent for GrammarProgress's single SRSEntry
│   │   │   │   ├── grammarSrs.service.ts    # SRSService's equivalent for grammar: JLPT-order queue refill, applyAnswer, intro choice
│   │   │   │   ├── storage.service.ts
│   │   │   │   ├── backup.service.ts        # Write-once pre-migration safety snapshots
│   │   │   │   ├── progressSerialization.ts # Shared (de)serialization for storage + Drive
│   │   │   │   ├── migration.service.ts
│   │   │   │   ├── sync/                    # Google Drive sync (see Services & Business Logic)
│   │   │   │   │   ├── driveClient.ts       # Raw Drive REST HTTP calls
│   │   │   │   │   ├── mergeProgress.ts     # Pure per-entry merge logic (vocab + grammar)
│   │   │   │   │   ├── googleDriveSync.ts   # Orchestrator: CAS retry, dedup, backups
│   │   │   │   │   └── types.ts
│   │   │   │   └── quiz.service.ts
│   │   │   ├── utils/                # Helper functions
│   │   │   │   ├── srs.utils.ts
│   │   │   │   ├── knowledge.utils.ts # Knowledge-points model + cumulative curve builder
│   │   │   │   ├── activity.utils.ts  # buildDailyActivity: shared per-day review bucketing (DailyProgressionChart + Main hub's daily card)
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
│   └── gokan-dictionary/            # SEO-crawlable static dictionary pages (kanji/vocab/grammar)
│       ├── src/                        # Svelte + Vite; currently a placeholder skeleton - see issue #19
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
- `grammarQueue`: Array of GrammarProgress (all grammar points ever introduced) - independent of `learningQueue`, added additively (no format-version migration needed, just a default-to-`[]` at hydration time - see Grammar Activity below)
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

### Grammar Activity (`grammar.model.ts`)

New SRS-driven activity alongside the vocab quiz (issue #17) - reuses `srs.service.ts`'s formula rather than a new algorithm, per the issue's resolved decision. See Services & Business Logic → Grammar Services and Application Pages → Grammar Screen for the rest of the design; this section only covers the data shapes.

**`GrammarPoint`** - One grammar point, sourced from the hanabira.org-japanese-content dataset (CC license, attribution required - see the About page's credit link)
- `id`: Stable id assigned at build time from the vendored snapshot (e.g. `"n5-001"`) - the upstream dataset has no ids of its own
- `title`, `shortExplanation`, `longExplanation`, `formation` (a template like `"Noun + が + いちばん + Adjective/Verb"`, shown to the user and also the source `gokan-dataset` matches against `GrammarExample.words[]` at build time to precompute `patternWordIndices`, below)
- `jlptLevel`: 1 (N1 hardest) .. 5 (N5 easiest) - every grammar point has one, unlike vocab's optional `jlptLevel` (this dataset is itself organized by level)
- `examples`: Array of `GrammarExample` (3-5 per point)

**`GrammarExample`** - `jp`/`romaji`/`en` plus `words: GrammarExampleWord[]`, a build-time tokenization of `jp` (via kuromoji) where each word is resolved against the compiled vocab dataset. Concatenating every word's `surface` reconstructs `jp` exactly. Also carries `patternWordIndices: number[]` - indices into `words[]` for this example's grammar-pattern markers, precomputed in `gokan-dataset` by matching `formation`'s literal Japanese against `words[]` (surface/`baseForm`/reading); empty when the pattern couldn't be confidently located in this specific example (rare - see the Grammar Dataset section and `gokan-dataset`'s pattern-location issue). The app never re-derives this - `computeBlankPlan` just reads it.

**`GrammarExampleWord`** - `{ surface, vocabId, reading?, baseForm? }`. `vocabId` is `null` for particles/symbols/anything unresolved (always shown literally, never blanked); when resolved, `reading` is the matched vocab's primary reading, embedded at build time as a cheap default. `baseForm` is kuromoji's dictionary/base form (e.g. `"思う"` for the conjugated token `"思っ"`), only set when it differs from `surface` - captured for build-time pattern-matching, currently unused at runtime. `computeBlankPlan` (`grammarSelectors.ts`) additionally does one runtime `VocabularyService.loadVocab(vocabId)` fetch per selected blank, at card-load time (not on submit, so grading stays synchronous) - this both supplies a full accept-list of writing variants for grading (surface, embedded reading, plus the fetched vocab's `writtenForm.kanji`/`alternatives`, `reading.primary`/`alternatives`, and any `mergedVocabs` readings) and the English gloss shown by the per-blank hint control.

**`GrammarProgress`** - User's SRS progress for one grammar point, mirroring `VocabProgress` but with a single `entry: SRSEntry` (no reading/meaning split - a grammar quiz has exactly one quiz type) and a single `needsRetry?: boolean` (not per-type).

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

### Grammar Service (`grammar.service.ts`) and Grammar SRS (`grammarSrs.service.ts`)

**`GrammarService`** - Loads grammar data from `public/data/compiled/grammar/` (synced from the `gokan-dataset` submodule like every other dataset - see Build & Development → Grammar Dataset for how it's produced).
- `loadJlptIndex()`: Load the JLPT level → grammar point ids index (`index/jlpt.json`)
- `loadGrammarPoint(id)`: Load an individual `GrammarPoint` by id (cached), from `points/{id}.json`

**`GrammarSRSService`** - `SRSService`'s equivalent for grammar, reusing its formula (`SRSService.calculateNextState`, made `static` non-private specifically so this class can call it) rather than inventing a new one:
- `createGrammarProgress(grammarId)` / `applyGrammarIntroChoice(progress, choice)`: mirror `SRSService.createVocabProgress`/`applyVocabIntroChoice`, but against a single `entry` instead of `reading`/`meaning`
- `applyAnswer(progress, result, latencyMs, now, intervalModifier?, frequencyModifier?)`: takes an already-combined `AnswerResult` (the caller - `useGrammarOrchestration`'s `submitGrammarAnswer` - grades every blank independently via `SRSService.analyzeError` and combines worst-of: any wrong blank beats any minor_error beats correct, since there is one SRS entry per grammar point, not one per blank). Retry handling (`needsRetry`, a single boolean here) mirrors vocab's per-quiz-type flag exactly, just without the type dimension.
- `getNextCandidates(currentQueue, maxToFind, ignoredIds?)` / `countLearnableGrammar` / `hasMoreLearnableGrammar`: walk JLPT order N5 → N1 (`GRAMMAR_JLPT_LEVELS`), source order within a level. **Always** this order - grammar has no frequency data to sort by (unlike vocab), so there's no `preferredLearningOrder` setting for it, and no kanji filtering either (kanji-awareness applies to which *vocab words* are blanked in a quiz sentence, not to which grammar points can be learned - see `computeBlankPlan` in State Management).

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
- `mergeGrammarProgress`/`mergeGrammarQueues`: grammar's equivalent - `mergeEntry` reused directly (one entry, no reading/meaning split to merge independently), `needsRetry` OR'd, `stage`/`nextReviewAt` re-derived via `grammarScheduling.ts`. `mergeGrammarQueues` is a pure union by `grammarId`.
- `mergeProgress`/`mergeSettings`: top-level merge - kanji knowledge is last-version-wins (local wins on a tie, to preserve un-pushed local edits/deletions), stats are field-wise max, `dailyOverride` is OR'd, `grammarQueue` merged via `mergeGrammarQueues`, and the sync version counter always bumps by 1 past the higher input.

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
- `grammarQueue` (issue #17) is a purely additive field, so it needs no version-gated pass at all - `migrateUserProgress` just fills `DEFAULT_GRAMMAR_PROGRESS` defaults into each item and recomputes its `nextReviewAt` via `grammarScheduling.ts`, unconditionally, every load
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
- **`quizSelectors.ts`** - `selectNextView(state, hasMoreLearnable, now)` is the **single source of truth** for "what should the quiz screen show right now". It replaces three previously-independent decision points (a queue-level `nextDue` memo, a `computeSessionView` function, and an ad-hoc `currentProgress.introductionAt` check in `VocabQuizScreen`) that could drift out of agreement. Returns `{ queueItem, sessionState, nextReviewAt, shouldShowIntro }`. Also exposes `selectCurrentProgress`, `selectCurrentSentence`, `collectActionableTaskKeys` (every quiz task actionable now, as `TaskKey[]`), `filterSessionCommit` (drops a vocab's `meaning` key from a snapshot when its `reading` key is present too - see `session` below for why), `selectSessionStats`, and `selectNextSessionPreview`. `selectSessionStats(state, hasMoreLearnable, now)` returns `{ done, total, retriesPending, waiting, moreNew }` computed against `state.session.committed`: `total` = committed set size (**fixed** for the session), `done` = committed tasks no longer actionable, `retriesPending` = committed tasks currently awaiting a retry (a wrong answer this session, shown highlighted and appended to the bar denominator), `waiting` = distinct vocab with tasks due *now* that aren't part of the session, `moreNew` = `hasMoreLearnable` (the "+" in "n+ waiting"). This replaced a `done + liveDueReviews` formula whose denominator **shrank on every wrong answer** (a wrong answer pushes the due date ~12h out - leaving the live due count - without incrementing `done`, and the pending retry was never re-counted). `selectNextSessionPreview(state, now)` returns `{ review, new, retries }`, a preview of what the *next* study session will contain - shown on the Main hub's quiz activity card before the user even clicks in. Bucketed per distinct vocab in `learningQueue` (graduated excluded), mutually exclusive with retries taking precedence over new, and new taking precedence over review; the review bucket reuses `isReadingActionable`/`isMeaningActionable` from `srs.utils.ts` rather than reimplementing due-ness.
- **`useQuizOrchestration.ts`** - Every effect (vocab/sentence loading, auto-advance timing, daily reset, persistence, migration triggering, Drive sync reconciliation, **session lifecycle** `SESSION_START`/`SESSION_END`) and every action (`submitAnswer`, `continueToNext`, `advanceQueue`, etc.), returning `{ actions, nextView, currentProgress, computed, sessionStats, nextSessionPreview }`. Mount-once effects use a `useRef` guard instead of the previous string-hack dependency array (`[state.progress ? 'loaded' : 'loading']`). Reads `useLocation()` (it renders inside `QuizProvider`, itself inside `BrowserRouter` - see `main.tsx`) to gate both the vocab-loading effect and the session-lifecycle effect to the `/quiz` route, so browsing Settings/Stats/the Main hub neither keeps fetching vocab in the background nor keeps a session alive - see the Main Screen entry in Application Pages.
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
  session: { committed: TaskKey[] } | null,   // active study session's frozen task set
  fatalError: string | null
}
```

**`session` (the committed task set)**: `TaskKey` is `` `${vocabId}:${quizType}` `` (built via the exported `taskKey()` helper). `session.committed` is captured **once** when a study session begins - a snapshot of every quiz task actionable at that moment (`collectActionableTaskKeys`), passed through `filterSessionCommit` before committing - and is extended only by the user's own "Learn" choices (`VOCAB_INTRO_CHOICE` adds the learned word's `reading` task). It never grows from background reviews coming due mid-session.

**Session lifecycle is route-gated** (see `[2026-08-02]` Main Screen entry below): a session can only be active while the user is on `/quiz`, so navigating to any other page (the Main hub, Settings, Stats, ...) ends it exactly like running out of due work does. `SESSION_END` simply clears `session`. There is no longer an end-of-session recap in state - the `[2026-08-04]` change replaced it with a **daily** activity card on the Main hub, sourced from persisted review history (`buildDailyActivity`) rather than the ephemeral session, so it stays accurate across however many sessions happen in a day; see the Main Screen entry in Application Pages.

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
- `SESSION_START` / `SESSION_END`: Set/clear `session` (the frozen task set behind the progress counter). `SESSION_START` takes the pre-computed `taskKeys` snapshot; `SESSION_END` is a no-op (same reference) when no session is active, otherwise clears it.
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

### Grammar Activity State (`context/quiz/grammarReducer.ts`, `grammarSelectors.ts`, `useGrammarOrchestration.ts`)

The Grammar activity (issue #17) is a **parallel concern within the same `QuizState`/`QuizProvider`**, not a second context/provider. `grammarQueue` lives on the same `UserProgress` object as `learningQueue`, and `useQuizOrchestration`'s persistence/Drive-sync effects key off `state.progress` reference changes generically - so a second provider would need its own read/write path onto that same object, racing the first. Instead:

- **`grammarReducer.ts`** - Defines the grammar-only slice of `QuizState` (`GrammarQuizState`, intersected into `QuizState`) and every `GRAMMAR_`-prefixed action, plus the pure `grammarReducer(state, action)` function. `quizReducer.ts`'s top-level `quizReducer` delegates to it via `isGrammarAction()` (a simple `action.type.startsWith('GRAMMAR_')` check) before its own `switch` - so vocab's reducer code needs no awareness of grammar's action shapes.
- **`grammarSelectors.ts`** - `selectNextGrammarView(state, hasMoreLearnableGrammar, now)` mirrors `selectNextView` (same `{ queueItem, sessionState, nextReviewAt, shouldShowIntro }` shape, `sessionState` typed `GrammarSessionState = Exclude<SessionState, 'learn-kanji'>` since grammar has no kanji-gated step). `computeBlankPlan(point, progress, reviewCount)` (**async**) is grammar-specific: walks the point's examples starting from a deterministic pick (hashed on `${grammarId}:${reviewCount}`, so repeated reviews of the same point cycle through its examples instead of re-rolling every render, wrapping around all examples) in four preference passes. **The grammar construction is the primary thing tested, vocabulary is secondary** - there is one `SRSEntry` per grammar point, so what gets graded has to consistently reflect grammar-point recall, or the schedule that entry drives doesn't mean what it claims to:
  1. **PRIMARY** - the first example whose grammar-pattern markers were located at dataset build time (`GrammarExample.patternWordIndices`, non-empty - see `gokan-dataset`'s `docs/SCHEMA.md` and its pattern-location issue). Blanks those markers unconditionally, regardless of vocab knowledge, then layers in - as **secondary** reinforcement - any other content word in that same example the user already knows (`learningQueue` entry with `introductionAt !== null`), sorted by position. Unknown vocab stays pre-filled as literal context either way.
  2. **FALLBACK** - the pattern isn't locatable in any of the point's examples (rare: ~1.9% of points as of the dataset's last build, all conjugation-transformation-style points with no literal marker in common across their own examples, e.g. potential-form verb tables). The first example containing at least one known word - blanks every known word in it. This is the *original* vocab-only behavior, now demoted to a fallback for the residual the primary path can't cover.
  3. **FALLBACK** - no example has a known word either, on one of these rare pattern-less points: the first example with ANY blankable word (resolved to a vocab id) at all, blanking exactly the single most frequent one (`VocabularyService.loadVocab(...).frequency.kanjiRank`, lowest wins) rather than every content word - blanking everything produced unanswerable cards for a learner with no vocab overlap yet.
  4. If literally no example in the whole point has a single blankable word, returns a read-only plan (`blankWordIndices: []`, `readOnly: true`) - `GrammarQuizCard` renders it as pure study material with no Submit step, since grading zero blanks previously auto-passed and silently granted SRS credit.

  For the blanks it selects, `computeBlankPlan` also resolves (via `VocabularyService.loadVocab`, once per blank, at load time so grading stays synchronous) an `acceptLists: string[][]` - surface, embedded reading, plus every writing variant the vocab fetch offers - and a `glosses: string[]` for the hint control. A failed fetch degrades gracefully to surface+reading and an empty gloss rather than blocking the card. `gradeGrammarAnswers(blankPlan, answers, hintLevels)` is the pure, separately-testable grading function: matches each answer against its blank's accept-list via `SRSService.evaluateAnswer` (same call vocab's reading quiz uses), forces `'minor_error'` for any blank whose hint was revealed to level 2 regardless of what was typed (issue #32 follow-up, RC3 item 3 - previously forced `'pass'`), and combines worst-of into one `AnswerResult` - **`wrong` > `pass` > `minor_error` > `correct`** (there's one SRSEntry per grammar point, not one per blank). `'pass'` itself is still reachable in the combiner - `SRSService.evaluateAnswer`/`analyzeError` grade a literal typed "pass" as `'pass'` independently of the hint system, same as vocab's reading quiz - it's just no longer what a revealed hint forces. Also exposes `selectCurrentGrammarProgress` and `selectNextGrammarSessionPreview` (mirrors `selectNextSessionPreview`'s `{ review, new, retries }` shape, same mutually-exclusive-bucket logic, for the Main hub's grammar activity card).
- **`useGrammarOrchestration.ts`** - Grammar's equivalent of `useQuizOrchestration`: loading (route-gated to `/grammar`, same guard-by-comparing-`currentGrammarQuizItem` pattern as vocab's vocab-loading effect, now `await`ing `computeBlankPlan`'s vocab fetches before dispatching `GRAMMAR_LOAD_SUCCESS`), auto-advance on a correct answer, and the actions (`setGrammarAnswer`, `revealGrammarHint`, `submitGrammarAnswer`, `advanceGrammarQueue`, `continueGrammarToNext`, `saveGrammarIntroChoice`). `submitGrammarAnswer` delegates grading to `gradeGrammarAnswers` (above) and is a no-op on a `readOnly` plan (nothing to grade). `continueGrammarToNext` branches on `currentGrammarBlankPlan.readOnly`: the normal path applies the combined result via `GrammarSRSService.applyAnswer`; the read-only path calls `GrammarSRSService.deferWithoutCredit` instead, which reschedules `dueDate` by a fixed 24h cooldown **without touching `memoryStrength`/`interval`/`difficulty`** - genuinely no SRS credit, just enough to keep the ungradable card from reappearing on the very next pick. Deliberately does **not** duplicate persistence/Drive-sync wiring - dispatching through the shared `quizReducer` gets that for free.
- **Per-blank hint control**: `grammarHintLevels: number[]` (parallel to `blankWordIndices`, reset whenever a new blank plan loads) tracks each blank's hint state - 0 = none, 1 = gloss shown (`revealGrammarHint` dispatches `GRAMMAR_REVEAL_HINT`, capped at 2), 2 = answer revealed. A revealed blank always grades `'minor_error'` (see `gradeGrammarAnswers` above), matching `CONSTANTS.srs.formula.resultFactors.minor_error` (+0.10) - giving up on a word you don't know still leaves an impression from reading the answer, so it's graded the same as a near-miss rather than as harshly as `'wrong'` (-0.40) or as a genuine skip (`'pass'`, -0.15).
- **Session-progress bar parity** (issue #32 follow-up): grammar now has the same frozen-committed-set progress counter vocab has, brought in once the v1 scope cut ("a smaller, reasonable scope decision") started to feel like a real gap. `grammarReducer.ts` gained a `GrammarSessionTracking { committed: string[] }` slice (`grammarSession`, mirroring vocab's `SessionTracking` but simpler - a `GrammarProgress` has one task per point, so `committed` is just grammar ids, no `TaskKey`-style `id:quizType` composite needed) plus `GRAMMAR_SESSION_START`/`GRAMMAR_SESSION_END` actions and a `grammarSessionHistory` array (`{ grammarId, title, result, delta }`, mirroring vocab's `sessionHistory`). `grammarSelectors.ts` gained `collectActionableGrammarIds(queue, now)` (grammar's `collectActionableTaskKeys`, using `isGrammarDue`/`needsRetry`) and `selectGrammarSessionStats(state, hasMoreLearnableGrammar, now)` (grammar's `selectSessionStats`, same `{ done, total, retriesPending, waiting, moreNew }` shape - no `filterSessionCommit`-style staggering to account for, since there's no reading/meaning split to stagger). `useGrammarOrchestration.ts` runs the matching session-lifecycle effect (route-gated to `/grammar`, active on `review`/`learn`) and computes each `continueGrammarToNext()` answer's mastery-delta `historyItem` the same way vocab's `continueToNext()` does. `GRAMMAR_INTRO_CHOICE`'s "learn" path adds the point to `grammarSession.committed`, mirroring `VOCAB_INTRO_CHOICE`.

`QuizContextValue` exposes the grammar activity as its own group of fields/actions (`grammarSessionState`, `grammarNextReviewAt`, `currentGrammarProgress`, `shouldShowGrammarIntro`, `nextGrammarSessionPreview`, `grammarSessionStats`, `grammarActions`, `grammarComputed`) alongside the vocab ones - `useQuiz()` is the single hook both activities read from.

---

## Application Pages

### Main Screen (`pages/main/MainScreen.tsx`)

The activity hub - the landing page (route `/`) after setup, replacing the previous behavior of dropping users straight into the quiz. Activities (the main actions a user can take) are presented as cards: "Vocabulary quiz session" (`/quiz`) and "Grammar quiz session" (`/grammar`, issue #17). Settings, Stats, and Kanji are **not** activities - they stay in the global header toolbar (`App.tsx`, rendered outside `<Routes>` so it's present on every page), unchanged by this page's introduction.

Both activity cards render their preview description via a shared `renderSessionPreviewDescription(preview, nextReviewAt)` helper (`MainScreen.tsx`): `"{review} review · {new} new"`, with `· {retries} retries` appended (in the error color) only when `retries > 0`. When all three counts are 0, it falls back to a caught-up message, showing the next review's ETA when one is known. The vocab card sources its preview from `selectNextSessionPreview(state, now)`; the grammar card from `selectNextGrammarSessionPreview(state, now)` - see State Management for both selectors, and Modification Log `[2026-08-04]`/`[2026-08-05]`.

`DailyActivityCard` (`pages/main/DailyActivityCard.tsx`) replaced the old ephemeral end-of-session recap (`[2026-08-02]`-era `lastSessionRecap`, removed `[2026-08-04]`): a **today** rollup (reviewed / correct / incorrect) plus a compact 7-day bar chart, both derived from `buildDailyActivity(progress, 7)` (`utils/activity.utils.ts`) - the same per-day bucketing `DailyProgressionChart` uses on the Stats screen. Reading persisted `reading.history`/`meaning.history` logs instead of session-local state means the card stays accurate across however many small sessions happen in a day, rather than being overwritten by the next session like the old recap was.

### Quiz Screen (`pages/quiz/VocabQuizScreen.tsx`)

Route `/quiz`. The study session itself - **explicit and boundable**, per the Main Screen's activity model: starting it snapshots the vocab available at that moment (`session.committed`, see State Management), and it ends the moment the user navigates to any other page (Main hub, Settings, Stats, ...) or naturally runs out of due work. Leaving early and running out both end the session identically - there's no separate "abandoned session" state. Resuming later (navigating back to `/quiz`) starts a brand new session against whatever is available then, never reopening the previous one.

Main study interface. Switches **exhaustively** on `sessionState` (a TypeScript `never` check at the `default` case fails to compile if a new `SessionState` value is ever added without being handled):

- **`'waiting'`**: Show `WaitingScreen` (next review time). Includes a "Back to activities" link to `/`, since `/quiz` is now a sub-page reached from the Main hub rather than the landing page itself.
- **`'exhausted'`**: Show `ExhaustedScreen` (no more content). Same "Back to activities" link as `WaitingScreen`.
- **`'learn-kanji'`**: Show `LearnKanjiCard` (KKLC step unlock)
- **`'review'` / `'learn'`**: Loading gate, then `shouldShowIntro` (from `selectNextView`) decides `VocabIntroCard` vs. the active quiz card (`VocabQuizCard` for reading, `VocabMeaningQuizCard` for meaning, keyed on `currentQuizItem.quizType`)

**Auto-advance logic**: Owned by `useQuizOrchestration`. If the queue has no valid items but can introduce new vocab, automatically calls `advanceQueue()`.

**Shared formatting** (`pages/quiz/quizFormatting.ts`): `formatReadingList`, `getUniquePosTags`, `getUniqueRelatedCompounds`, and the `useExpandableDefinitions` hook are shared across `VocabQuizCard`, `VocabMeaningQuizCard`, and `VocabIntroCard` rather than being reimplemented in each.

**Shared focus management** (`hooks/useQuizFocusManagement.ts`, issue #32 follow-up RC4 item 2): `VocabBaseQuizCard` and `GrammarQuizCard` both need the same two behaviors - focus the first input on a fresh question (or when feedback clears for a retry), and focus the Continue button once feedback is showing, *unless* the current result is about to auto-advance on its own (a correct reading answer for vocab, a fully-correct answer for grammar) in which case focus is left alone rather than yanked onto a button about to disappear. Previously `VocabBaseQuizCard` (then named `BaseQuizCard`) had this logic inline and `GrammarQuizCard` had none at all - after submitting a grammar answer, focus was left on the now-disabled blank inputs, so Enter did nothing and a mouse became mandatory to continue. `useQuizFocusManagement({ feedbackShown, skipContinueFocus, continueFocusDelay }, deps)` returns `{ firstInputRef, continueRef }`; `deps` is a plain effect dependency array, left to the caller so each card can key the refocus on whatever identifies "a new question" for it (vocab: `[currentVocab?.id, feedback, quizType]`; grammar: `[point?.id, plan, feedback]`). `VocabBaseQuizCard` still owns its own separate effect for the incorrect-answer reveal-delay (`showCorrectAnswer`), which is a display concern, not a focus one.

**Shared session-progress header** (`components/SessionProgress.tsx`, issue #32 follow-up): the `done / total` counter plus its embedded `HistoryTicker` (most-recent-answers strip, correctness color + score delta) is fully presentational, parameterized over a `stats: SessionProgressStats` object and a `history: SessionHistoryEntry[]` array (`{ key, href, label, result, delta }`) rather than reading vocab-specific context directly - the same "mutualize, don't duplicate" treatment `SRSHistoryGraph`/`useQuizFocusManagement` got. `VocabQuizScreen` builds its props from `sessionStats`/`state.sessionHistory` (links to `/vocab/:id`); `GrammarScreen` builds its own from `grammarSessionStats`/`state.grammarSessionHistory` (links to `/grammar/:grammarId`, `waitingNoun="grammar points"` vs. vocab's `"vocab"`). Session-progress bar parity for grammar (previously a deliberate v1 scope cut) is covered in State Management → Grammar Activity State. The `HistoryTicker`'s per-item label now renders in `font-mincho` (was `font-serif`, which has no CJK fallback - the same class of bug the `[2026-08-05]` `GrammarIntroCard` title fix addressed), since both vocab written forms and grammar titles are Japanese text.

### Grammar Screen (`pages/grammar/GrammarScreen.tsx`)

Route `/grammar` (issue #17). The Grammar activity - a second SRS-driven study session alongside `/quiz`, following the same "explicit and boundable" activity model but with its own, simpler state machine (see State Management → Grammar Activity State). Switches exhaustively on `grammarSessionState` (`GrammarSessionState`, a `never`-checked default case same as `VocabQuizScreen`):

- **`'waiting'` / `'exhausted'`**: Inline `CenteredCard` messages (not `WaitingScreen`/`ExhaustedScreen` - those are vocab-copy-specific, e.g. "Learn more words"), each with a "Back to activities" link.
- **`'review'` / `'learn'`**: Loading gate, then `shouldShowGrammarIntro` (from `selectNextGrammarView`) decides `GrammarIntroCard` vs. a `SessionProgress` header (`stats={grammarSessionStats}`, `history={...grammarSessionHistory mapped to /grammar/:grammarId links}`, `waitingNoun="grammar points"`) plus `GrammarQuizCard`, positioned the same way `VocabQuizScreen` positions its own `SessionProgress` above `VocabQuizCard`/`VocabMeaningQuizCard` (issue #32 follow-up).

**`GrammarIntroCard`** (`pages/grammar/GrammarIntroCard.tsx`) - mirrors `VocabIntroCard`'s layout: a top-right `MasteryRing` (`currentGrammarProgress?.entry.memoryStrength ?? 0` - reads `0` here since an intro candidate has no `GrammarProgress` entry yet, same as a fresh vocab intro card would; issue #32 follow-up RC3 item 1), JLPT chip, title (rendered in `font-mincho`, **not** `font-serif` - the title contains Japanese characters and `font-serif`'s font stack, "Source Serif 4, Georgia, serif", has no CJK fallback at all, unlike `font-mincho`/`font-gothic` which both list a Noto JP fallback; caught via a scripted browser pass, see Modification Log `[2026-08-05]`), short explanation, and the `formation` template in its own bordered box - appropriate here since this is the "here's what you're about to learn" screen, unlike the quiz card below where it would be the answer.

**`GrammarQuizCard`** (`pages/grammar/GrammarQuizCard.tsx`) - the fill-in-the-blank translation exercise: a top-right `MasteryRing` reflecting the point's own `SRSEntry` (`currentGrammarProgress?.entry.memoryStrength ?? 0`, mirroring `VocabQuizCard`/`VocabMeaningQuizCard`'s use of the same component for vocab - issue #32 follow-up RC3 item 1), then `example.en` as the prompt, then `example.words[]` rendered inline as literal `<span>`s interspersed with an `<input>` for every index in `currentGrammarBlankPlan.blankWordIndices` (see `computeBlankPlan`). Deliberately does **not** show `grammarPoint.formation` **or** `grammarPoint.title` anywhere on this card (RC3 item 2; RC4 item 1 for the title) - unlike the intro card, this one is testing recall of the blanked pattern, and either one can literally spell out the answer (many points' `title` *is* the formation written out, e.g. `それじゃ、～`). Only the JLPT chip stays. Each input is sized from its own **live typed value** (`Math.max(4, value.length + 1)ch`), not from the expected answer - sizing from the answer both froze the width and leaked the answer's character count before the user typed anything (issue #32, item 1). Does **not** reuse `VocabBaseQuizCard`'s markup (single-input-specific) - grammar needs multiple discrete inputs, so it owns its own form/submit/feedback JSX instead, reusing the `Card`/`CardSection` primitives, the same feedback-styling conventions (border colors, `bg-feedback-background`) as vocab's cards, and (RC4 item 2) the shared `useQuizFocusManagement` hook for keyboard-only flow - see the Quiz Screen entry above for details. On feedback, each blank's own border color reflects its individual `perBlankResults` entry (not just the combined result), and the *matched* accepted form (`feedback.matchedAnswers[i]`, not a fixed "expected" string) is revealed beneath any non-correct blank.

Each blank also has a small "?" hint button (hidden once feedback is shown): first click shows the word's English gloss beneath the input, second click reveals the answer (`plan.acceptLists[i][0]`) directly in the now-disabled input and grades that blank as `'minor_error'` on submit regardless of what was typed before (RC3 item 3 - previously `'pass'`) - see `grammarHintLevels` in State Management → Grammar Activity State.

When `currentGrammarBlankPlan.readOnly` is true (no blankable word in any of the point's examples - issue #32, item 6), `GrammarQuizCard` renders an early-return read-only variant instead: the full Japanese sentence as plain text, no inputs, and a single always-enabled Continue button (`grammarActions.continueGrammarToNext()` directly, bypassing the Submit/feedback cycle since there's nothing to grade). `grammarComputed.canSubmitGrammar` additionally requires `blankWordIndices.length > 0`, so an empty card can never reach Submit even if this render path were somehow skipped.

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

### Grammar Detail Screen (`pages/grammar/GrammarDetailScreen.tsx`)

Route: `/grammar/:grammarId` (issue #32 follow-up). Mirrors `VocabDetailScreen`'s card-based layout, letting a user look at a single grammar point outside of a live review:
- Title, JLPT chip, a `MasteryRing` reading the point's own `GrammarProgress.entry.memoryStrength` (`0` if not yet introduced), `shortExplanation`/`longExplanation`, `formation` (safe to show here, unlike on `GrammarQuizCard` - this is a study page, not a recall test), and every one of the point's example sentences (`jp`/`romaji`/`en`)
- An "Add to Grammar Queue" button when the point hasn't been introduced yet, dispatching the same `GRAMMAR_INTRO_CHOICE`-backed `grammarActions.saveGrammarIntroChoice(point, 'learn')` action `GrammarIntroCard`'s "Learn" button uses - mirrors `VocabDetailScreen`'s "Add to Learning List"
- Once introduced, a Stats card (reviews, interval, introduced date, next review) plus the shared `SRSHistoryGraph` (see below) plotted against the point's single `entry`
- Linked from `GrammarIntroCard`'s title and from the JLPT chip on `GrammarQuizCard` (both the normal and read-only variants) - deliberately **not** the quiz card's title, since RC4 removed that specifically to stop leaking the answer (see Application Pages → Grammar Screen)

**`SRSHistoryGraph`** (`components/SRSHistoryGraph.tsx`, renamed from `VocabHistoryGraph.tsx`): generalized to plot an arbitrary list of `{key, label, entry, color}` series against one shared time axis, rather than being hardcoded to vocab's reading/meaning pair - a `GrammarProgress.entry` is shaped exactly like a `VocabProgress.reading`/`meaning` entry for this purpose, so `GrammarDetailScreen` reuses the same component with a single-entry series instead of a second implementation. `VocabDetailScreen` passes two series (reading, meaning); `GrammarDetailScreen` passes one (grammar).

### Statistics Screen (`pages/stats/StatsScreen.tsx`)

- `StatsOverview` - headline counters (including Kanji Coverage)
- `KnowledgeCurveChart` - cumulative knowledge held over time (steady growth vs. plateau); see `utils/knowledge.utils.ts`
- `JlptCoverageChart` - five stacked bars (N5 at top → N1), each showing mastered / in-progress / untouched against that level's total, off `index/jlpt.json`. "Mastered" uses `isVocabFullyMastered` so the split matches the scheduler's definition rather than reimplementing it. Rendering (headline, legend, bars, `<details>` table) lives in a shared `JlptCoverageBars` component (`pages/stats/components/JlptCoverageBars.tsx`, issue #32 follow-up) taking `rows: JlptLevelRow[]` + an `itemLabel` string - `JlptCoverageChart` only computes `rows` from vocab-shaped data (`learningQueue` + `isVocabFullyMastered`). One hue in two steps (solid accent + 35% accent) rather than two hues, since the segments are ordinal stages and the design system reserves the secondary accent for errors; a legend and direct `n / total` labels carry the distinction so it never rests on color alone
- `GrammarJlptCoverageChart` (issue #32 follow-up) - grammar's equivalent, same `JlptCoverageBars` renderer, computing `rows` from `grammarQueue` + `grammar/index/jlpt.json` (`GrammarService.loadJlptIndex()`) + `isGrammarFullyMastered` instead. Kept as a separate component rather than folded into `JlptCoverageChart` since the index shape (no `containedKanji`) and mastery predicate (no `settings` param) genuinely differ between the two activities - only the bar/legend/table rendering is shared
- `DailyProgressionChart` - per-day review activity (correct/incorrect), last 14 days, built on the shared `buildDailyActivity` helper (`utils/activity.utils.ts`) also used by the Main hub's `DailyActivityCard`. Since issue #32's follow-up, `buildDailyActivity` folds in `entry.history` off `grammarQueue` alongside `reading.history`/`meaning.history` off `learningQueue`, so both this chart and the daily activity card reflect grammar reviews too, not just vocab ones - there is no separate grammar-only variant
- `ReviewForecast` - upcoming review load
- `SmartVocabList` - searchable/sortable/paginated vocabulary list. Fully-mastered items are **hidden by default** (via `isVocabFullyMastered`) behind a "Show mastered (N)" checkbox; search/sort/page/showMastered all persist in `sessionStorage` so returning from a vocab detail page restores the list
- `SmartGrammarList` (`pages/stats/components/SmartGrammarList.tsx`, issue #32 follow-up) - grammar's equivalent, same interaction model (search, sort, paginate, "Show mastered (N)" hidden by default via `isGrammarFullyMastered`, `sessionStorage`-persisted controls under a separate key) driven by `grammarQueue` instead of `learningQueue`. Simpler than `SmartVocabList` since a `GrammarProgress` has one `SRSEntry` (no reading/meaning split) and grammar has no frequency data to sort by (JLPT level stands in for that column instead). Renders `GrammarCard` (`components/GrammarCard.tsx`, mirrors `VocabCard.tsx`) for loaded rows and reuses `VocabCardSkeleton` (`components/VocabCardLoader.tsx`) as the loading placeholder - purely generic gray-bar filler, not vocab-specific despite the name, so not worth a duplicate. Each row navigates to `/grammar/:grammarId`

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
bun run --cwd apps/gokan-srs build:grammar # Rebuild compiled/grammar/ from the vendored hanabira snapshot (delegates into the submodule; see Grammar Dataset below)
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

### Grammar Dataset

The grammar dataset (issue #17) follows the same split as vocab/kanji/sentences: raw source, build pipeline, and compiled output all live in the **`gokan-dataset`** submodule, synced into `public/data/compiled/grammar/` by the normal `sync-dataset.ts` step - there is no `gokan-srs`-side data or build script for it.

- **Source**: [hanabira.org-japanese-content](https://github.com/tristcoil/hanabira.org-japanese-content) (Creative Commons, attribution required - see the credit link on the About page), vendored as a frozen snapshot at `dataset/data/raw/grammar/grammar_ja_{N5,N4,N3,N2,N1}_full_alphabetical_0001.json` (828 grammar points total: N5 136, N4 124, N3 132, N2 191, N1 245). "Vendored snapshot vs. periodic re-sync" was the one ingestion detail issue #17 left open at implementation time; a vendored snapshot was chosen (re-running `build:grammar` against a manually-refreshed `raw/` snapshot is the update path if hanabira's content ever needs a refresh), matching every other raw source in the dataset repo.
- **`dataset/scripts/build-grammar.ts`**: reads the raw JSON, assigns stable ids (`${level}-${index}`, e.g. `"n5-001"` - the upstream dataset has no ids of its own, and since the snapshot is frozen these stay stable across rebuilds), and tokenizes every example sentence with a small, dedicated **kuromoji** pass to resolve each content word (`名詞`/`動詞`/`形容詞`/`副詞` POS tags only; particles/symbols always stay literal) against the already-compiled `compiled/index/search.json`, capturing each word's `baseForm` (kuromoji's dictionary form) alongside `surface`/`reading`. This is a smaller, purpose-built tokenizer/matcher, not a reuse of the submodule's own `SentenceTokenizer` (which handles conjugation/compound-matching nuance this pipeline doesn't need - see its `[2026-02-28]` log entry). Needs `build:data` to have run first (so `compiled/index/search.json` exists); not chained into `build:data` itself, since it's a small, independently-runnable pass, not another walk over the full sentence corpus.
- **`dataset/scripts/grammar-pattern-matcher.ts`**: for each example, matches `formation`'s literal Japanese against `words[]` (surface, `baseForm`, and reading, trying multiple formation-alternative variants and multi-token spans) to precompute `patternWordIndices` - which words are the point's literal grammar-pattern markers, as opposed to vocabulary filling its slots. Runs at build time specifically so `gokan-srs` never has to re-derive this at runtime; 99.9% of points have it located in at least one example as of the last build (one documented exception - see `gokan-dataset`'s pattern-location issue for the full methodology and the exception's rationale).
- **Output**: `compiled/grammar/points/{id}.json` (one `GrammarPoint` per file, mirroring `vocab/{id}.json`) and `compiled/grammar/index/jlpt.json` (level → ordered id list, mirroring `index/jlpt.json`'s shape). Synced into `public/data/compiled/grammar/` exactly like vocab/kanji/sentences - gitignored in `gokan-srs`, regenerated on demand.
- **History**: the initial issue #17 implementation vendored this data directly into `gokan-srs` instead, because the autonomous agent's per-repo GitHub App installation token only had push access to `gokan-srs`, not the separate `gokan-dataset` repo - it had no way to open a PR there itself. Fixed by moving the raw data, build script, and compiled output into `gokan-dataset` (PR opened and merged by a maintainer working across both repos) and repointing `gokan-srs` at the updated submodule commit, consuming the output the same way as every other dataset. If a future agent needs to add data to `gokan-dataset`, it needs credentials scoped to that repo too (a broader GitHub App token or a PAT) - this hasn't been set up, so cross-repo dataset changes currently need a human/maintainer step.

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
- `src/services/grammarScheduling.test.ts` - `grammarNextReviewAt`/`isGrammarFullyMastered`/`isGrammarDue` unit tests (grammar's single-entry equivalent)
- `src/services/grammarSrs.service.test.ts` - `GrammarSRSService` tests: intro choice (learn/skip), `applyAnswer` (correct/wrong/retry/graduation, mirroring vocab's retry-is-training-only invariant), and JLPT-order candidate finding/counting
- `src/services/migration.service.test.ts` - Data migration tests
  - Old format (mastery) to new format (memoryStrength/interval) conversion
  - Edge cases (mastery 0, mastery 100)
  - Idempotency (already-migrated data not re-migrated)
  - Real production data samples
  - `needsRetry` boolean→object normalization
  - Two-tier version regression guards (sync pass never pre-empts the async pass)
  - `grammarQueue` defaulting to `[]` when absent, defaults filled into a partial `GrammarProgress` item, and a graduated item's `nextReviewAt` staying `null` rather than re-deriving from a stale `dueDate`
- `src/services/migration.roundtrip.test.ts` - Golden round-trip test: a realistic snapshot spanning old/mixed/current-format items pushed through the full migrate→hydrate→serialize→reparse pipeline, asserting zero data loss (no vocab dropped, no history lost, no due date nulled)
- `src/context/quiz/quizReducer.test.ts` - Reducer unit tests (every action, including `RECONCILE_REMOTE`, `SESSION_START`/`SESSION_END`, and `VOCAB_INTRO_CHOICE` extending the session's committed task set on "Learn")
- `src/context/quiz/quizSelectors.test.ts` - `selectNextView` across all session states + the meaning-disabled edge case, `selectCurrentProgress`, `selectCurrentSentence`, `selectSessionStats` (stable `total`, `done` on de-actioned tasks, the pending-retry regression that no longer shrinks the total, mid-session arrivals counted as `waiting` not total, `moreNew`, and the reading/meaning-stagger regression - one reading answer must only increment `done` by 1, not 2), `filterSessionCommit` directly, and `selectNextSessionPreview` (mutually exclusive buckets, retries taking precedence over new/review, meaning-disabled ignoring meaning due dates, graduated vocab excluded)
- `src/context/quiz/grammarReducer.test.ts` - Reducer unit tests for every `GRAMMAR_` action (load lifecycle, set/submit answer, update-after-answer plus its optional `grammarSessionHistory` push, advance queue, `GRAMMAR_SESSION_START`/`GRAMMAR_SESSION_END`, intro choice's learn/skip/detail-page-insert paths including the "learn" path extending `grammarSession.committed`), dispatched through the shared `quizReducer`
- `src/context/quiz/grammarSelectors.test.ts` - `selectNextGrammarView` across all session states + `shouldShowIntro`; `computeBlankPlan` (blanks only known vocab, accept-list construction including a failed-fetch fallback and vocab writtenForm/reading/mergedVocabs variants, gloss resolution, a queued-but-never-introduced vocab entry does not count as known, preferring a different example with a known word over an example with none - issue #32 item 5.1, the single-most-frequent-word fallback when nothing is known anywhere - item 5.2, skipping a zero-candidate example in favor of another in the same point and the read-only plan when literally none qualify - item 6, deterministic example selection, no-examples edge case); `gradeGrammarAnswers` (kanji/variant/reading forms all grading `correct` against the same accept-list, an unrelated answer grading `wrong`, a revealed (`hintLevel >= 2`) blank always grading `minor_error` regardless of input - RC3 item 3, previously `pass` - and the worst-of precedence `wrong > pass > minor_error > correct`, including that a literal typed "pass" is still reachable independently of the hint system); `selectCurrentGrammarProgress`; `selectNextGrammarSessionPreview`; `collectActionableGrammarIds` (due-or-retry inclusion, not-yet-due and graduated exclusion); and `selectGrammarSessionStats` (mirrors `quizSelectors.test.ts`'s `selectSessionStats` coverage - stable `total`, `done` on de-actioned points, `retriesPending`, mid-session arrivals counted as `waiting` not `total`)
- `src/services/sync/mergeProgress.test.ts` - Per-entry merge tests, including the core fix: a device that only reviewed reading can never clobber another device's meaning review; plus `mergeGrammarProgress`/`mergeGrammarQueues` tests and a top-level `mergeProgress` assertion that `grammarQueue` merges as a pure union
- `src/services/sync/driveClient.test.ts` - Drive REST wrapper tests (auth-error translation)
- `src/services/sync/googleDriveSync.test.ts` - CAS retry-on-conflict, duplicate-file reconciliation, write-once remote backup
- `src/utils/knowledge.utils.test.ts` - Knowledge-points model tests: mastery-curve normalisation (a vocab mastered in reading + meaning is worth exactly 200), the interval→strength inversion (including undoing the `wrong`/`minor_error` post-processing multipliers and the frequency modifier), and curve construction (per-day bucketing, pre-window baseline collapsing, skipped-vocab crediting, knowledge loss after a failure, future-dated-log rejection)
- `src/utils/activity.utils.test.ts` - `buildDailyActivity` tests: zeroed buckets with no history, correct/minor_error grouped as correct and wrong as incorrect with pass excluded, reading + meaning history aggregated together, calendar-day bucketing (not exact timestamp), and logs outside the requested window dropped
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
   - **Reading and meaning quizzes are batched, and the active batch is sticky**: `getNextVocabToStudy(queue, settings, now, preferredType)` takes an optional `preferredType` hint (the `quizType` of the card currently on screen, threaded in by `selectNextView` from `state.currentQuizItem`). While that type still has actionable work, it keeps being served - even if an item of the *other* type becomes actionable mid-batch (a retry flag flipping, or a review simply coming due while the user studies). Only once the active type's pool runs dry does selection fall back to the reading > meaning priority. Without this, a reading item becoming due partway through a run of meaning quizzes would hijack the very next card - see the `[2026-07-24]` changelog entry for the bug this fixes and `QuizTypeIndicator` (`VocabBaseQuizCard.tsx`) for the accompanying on-screen "Reading"/"Meaning" phase label.

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

### Grammar Quiz Flow (issue #17, blank-selection/grading revised for issue #32, made pattern-primary for issue #33)

1. `useGrammarOrchestration`'s load effect resolves a `GrammarPoint` and `await`s `computeBlankPlan` for a fixed `{ exampleIndex, blankWordIndices, acceptLists, glosses, readOnly }` for this turn - see State Management → Grammar Activity State for the four-pass selection rule (prefer an example with a located grammar pattern, blanking it plus any known vocab as reinforcement; else fall back to known-vocab-only, then a single most-frequent candidate, then read-only)
2. If `readOnly`, the card renders as study material with a Continue-only button and steps 2-4 below don't apply - see Application Pages → Grammar Screen
3. Otherwise, the user types into each blank's discrete input (one per `blankWordIndices` entry, live-sized to what's typed); non-blank words are shown as plain literal text. Each blank also has a "?" hint control (gloss, then reveal - see State Management)
4. `submitGrammarAnswer()` delegates to `gradeGrammarAnswers(blankPlan, answers, hintLevels)`: matches each answer against its blank's accept-list via `SRSService.evaluateAnswer` (a revealed blank always grades `'minor_error'` regardless of input), then combines the per-blank results **worst-of** - `wrong` > `pass` > `minor_error` > `correct` - into one `AnswerResult`
5. Feedback shown per-blank (each input's border reflects its own result) plus the combined message; non-correct blanks reveal the accepted form they actually matched
6. `continueGrammarToNext()` applies the combined result to the grammar point's single SRS entry via `GrammarSRSService.applyAnswer()` (or, for a `readOnly` plan, `GrammarSRSService.deferWithoutCredit()` instead - no grading happened, so no SRS credit), then advances to the next queued grammar point

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

- **[2026-08-07]**:
  - **Grammar detail page + Grammar coverage in Statistics** (issue #32 follow-up, two feature gaps beyond the RC3/RC4 fixes above - both mutualized with the vocab equivalents wherever the data shapes genuinely line up, per the same principle as RC4's `useQuizFocusManagement` extraction):
    1. **`GrammarDetailScreen`** (`pages/grammar/GrammarDetailScreen.tsx`, route `/grammar/:grammarId`) - there was no way to look at a single grammar point outside of a live review, mirroring the gap `VocabDetailScreen`/`KanjiDetailScreen` already closed for their own activities. Shows title, JLPT chip, mastery ring, `shortExplanation`/`longExplanation`, `formation` (safe here, unlike on the quiz card), every example sentence, and - once introduced - a stats card with reviews/interval/dates plus a history graph. An "Add to Grammar Queue" button (dispatching the same action `GrammarIntroCard`'s "Learn" button uses) lets a point be queued directly from its detail page, mirroring `VocabDetailScreen`'s "Add to Learning List". Linked from `GrammarIntroCard`'s title and from `GrammarQuizCard`'s JLPT chip - deliberately not the quiz card's title, since RC4 removed that specifically to stop leaking the answer.
    2. **`VocabHistoryGraph` generalized into `SRSHistoryGraph`** (`components/SRSHistoryGraph.tsx`): a `GrammarProgress.entry` is shaped exactly like a `VocabProgress.reading`/`meaning` entry for plotting purposes, so rather than writing a second SVG history-graph component from scratch, the existing one was generalized to take a `series: {key, label, entry, color}[]` instead of hardcoded `readingEntry`/`meaningEntry` props. `VocabDetailScreen` now passes two series; `GrammarDetailScreen` passes one.
    3. **Grammar folded into Statistics** (`StatsScreen`), in the same three places vocab already covers:
       - **Daily progress**: `buildDailyActivity` (`utils/activity.utils.ts`) now also folds in `entry.history` off `grammarQueue` alongside `reading.history`/`meaning.history` off `learningQueue`, via a shared `applyLog` closure rather than a duplicated aggregation pass. `DailyProgressionChart` and the Main hub's `DailyActivityCard` both get this automatically (single combined rollup, not a separate grammar chart) since both already consume this helper.
       - **JLPT coverage**: extracted the bar/legend/table rendering out of `JlptCoverageChart` into a shared `JlptCoverageBars` component (`pages/stats/components/JlptCoverageBars.tsx`, taking `rows: JlptLevelRow[]` + an `itemLabel` string), then added `GrammarJlptCoverageChart` as a second, separate data-computing wrapper around it (`grammarQueue` + `grammar/index/jlpt.json` + `isGrammarFullyMastered`, no `settings` param needed since grammar mastery isn't settings-gated). Kept as two chart components rather than one merged chart since the underlying index shape and mastery predicate genuinely differ between the activities - only the rendering was duplicated before this, so only the rendering was mutualized.
       - **Grammar element list**: new `SmartGrammarList` (`pages/stats/components/SmartGrammarList.tsx`) mirrors `SmartVocabList`'s interaction model (search/sort/paginate, mastered hidden by default behind "Show mastered (N)", `sessionStorage`-persisted controls under a separate key) against `grammarQueue` instead of `learningQueue` - simplified since a `GrammarProgress` has one `SRSEntry` (no reading/meaning split) and grammar has no frequency data (JLPT level fills that sort slot instead). Renders a new `GrammarCard` (`components/GrammarCard.tsx`, mirrors `VocabCard.tsx`) and reuses the existing `VocabCardSkeleton` as its loading placeholder rather than duplicating a skeleton, since that component's content is generic gray-bar filler with nothing vocab-specific in it despite the name. Each row links to `/grammar/:grammarId`.
    - Verified: `bun run typecheck` (only the pre-existing `vite-plugin-checker` peer-dependency errors), `bun run test` (343 tests, 2 new covering `buildDailyActivity`'s grammar-history aggregation - no other new pure logic needed unit tests, the rest is presentational), `bun run lint` (only pre-existing debt in files this change didn't touch), `bun run build` (clean, dataset submodule initialized read-only to verify - no submodule content or pointer touched).

  - **Grammar session-progress parity + vocab-specific renames** (issue #32 follow-up, on top of the detail-page/stats work directly above):
    1. **Session-progress header for grammar**: brought grammar to parity with the frozen-committed-set progress counter vocab has had since `[2026-07-22]`. `grammarReducer.ts` gained `GrammarSessionTracking { committed: string[] }` (the `grammarSession` field - simpler than vocab's `SessionTracking`/`TaskKey` since a `GrammarProgress` has one task per point, not a reading/meaning pair), `GRAMMAR_SESSION_START`/`GRAMMAR_SESSION_END` actions, and a `grammarSessionHistory` array. `grammarSelectors.ts` gained `collectActionableGrammarIds`/`selectGrammarSessionStats`, mirroring `collectActionableTaskKeys`/`selectSessionStats` (no `filterSessionCommit`-equivalent needed - nothing to stagger with a single SRSEntry per point). `useGrammarOrchestration.ts` runs the matching route-gated session-lifecycle effect and computes a mastery-delta `historyItem` in `continueGrammarToNext()`, same as vocab's `continueToNext()`. Rather than writing a second `SessionProgress`/`HistoryTicker` for grammar, `components/SessionProgress.tsx` itself was generalized into a presentational component parameterized over `stats`/`history`/`waitingNoun` props (the same "mutualize, don't duplicate" treatment `SRSHistoryGraph` and `useQuizFocusManagement` got in the two prior rounds) - `VocabQuizScreen` and `GrammarScreen` each build their own props from their own state slice and pass them to the one shared component. Fixed a latent bug while touching `HistoryTicker`: the per-item label (vocab written forms, now also grammar titles) rendered in `font-serif`, which has no CJK fallback - switched to `font-mincho`, the same class of fix `[2026-08-05]`'s `GrammarIntroCard` title already needed.
    2. **Vocab-specific naming**: with two quiz activities now sharing the `context/quiz/` state layer, several files that are actually vocab-only were still named with the bare, generic "Quiz" prefix as if activity-agnostic. Renamed `pages/quiz/QuizScreen.tsx` → `VocabQuizScreen.tsx`, `QuizCard.tsx` → `VocabQuizCard.tsx`, `MeaningQuizCard.tsx` → `VocabMeaningQuizCard.tsx`, and `BaseQuizCard.tsx` → `VocabBaseQuizCard.tsx` (component names renamed to match). `components/SessionProgress.tsx` keeps its bare name despite also being vocab-specific-turned-shared, since it's now genuinely shared code (per item 1) - the same reasoning that kept `SRSHistoryGraph`'s name un-prefixed after it absorbed `VocabHistoryGraph`. Left untouched, as genuinely shared: `context/quiz/quizReducer.ts`/`quizSelectors.ts`/`useQuizOrchestration.ts`/`QuizProvider.tsx` (the `QuizState`/`QuizContextValue` shapes span both activities by design) and `hooks/useQuizFocusManagement.ts`.
    - Verified: `bun run typecheck` (only the pre-existing `vite-plugin-checker` peer-dependency errors), `bun run test` (356 tests, 13 new covering the reducer/selector additions from item 1), `bun run lint` (no new issues - the handful of lint findings that shifted line numbers inside touched files, e.g. `grammarReducer.ts`'s pre-existing `GRAMMAR_LOAD_ERROR` `error: any` and `GrammarScreen.tsx`'s pre-existing `Date.now()` purity warning, were confirmed present at the same call sites before this change via a stashed before/after lint diff), `bun run build` (clean, dataset submodule initialized read-only to verify - no submodule content or pointer touched).

- **[2026-08-06]**:
  - **Grammar quiz follow-up from hands-on testing, RC4** (issue #32, two small app-only fixes on top of RC3 directly below, no `dataset/` changes):
    1. **The point title still leaked the answer**: RC3 item 2 only checked whether `GrammarQuizCard` rendered `grammarPoint.formation` (it didn't). It missed that the card also rendered `grammarPoint.title` right above the sentence - and for many points the title *is* the formation spelled out (e.g. an N5 point titled `それじゃ、～` whose blank is exactly `それじゃ`). Removed `point.title` from both of `GrammarQuizCard`'s render paths (the normal quiz form and the `readOnly` study-material variant); the JLPT chip alone stays. `GrammarIntroCard` is unaffected - showing the title there is correct, it's the "here's what you're about to learn" screen.
    2. **Keyboard-only flow broke after submitting a grammar answer**: `BaseQuizCard` moves focus to the Continue button once feedback shows (so Enter submits, then Enter again continues); `GrammarQuizCard` had no equivalent, leaving focus on the disabled blank inputs after `GRAMMAR_SUBMIT_ANSWER` and making the mouse mandatory to continue. Extracted the shared behavior into a new `useQuizFocusManagement` hook (`hooks/useQuizFocusManagement.ts` - see Application Pages → Quiz Screen → "Shared focus management" and Project Structure) rather than growing a second parallel copy in `GrammarQuizCard`. `BaseQuizCard`'s previous single combined effect (focus + the incorrect-answer reveal-delay) was split: the reveal-delay (`showCorrectAnswer`) stays as its own local effect since it's a display concern the grammar card has no equivalent of, while the focus behavior itself moved into the shared hook, called identically (same dependency arrays, same delays) from both cards - `BaseQuizCard`'s wiring is behavior-preserving, `GrammarQuizCard` gained the Continue-focus behavior it previously lacked entirely.
    - Verified: `bun run typecheck` (only the pre-existing `vite-plugin-checker` peer-dependency errors), `bun run test` (341 tests, all passing, no new tests needed - this is a UI-only refactor/behavior change with no new pure logic to unit-test), `bun run lint` (only pre-existing `no-explicit-any`/`react-hooks/set-state-in-effect` debt already present before this change, none newly introduced), `bun run build` (clean, dataset submodule initialized read-only to verify - no submodule content changed).

  - **Grammar quiz follow-up from hands-on testing, RC3** (issue #32, on top of the pattern-primary blanking work directly below - three small app-only fixes, no `dataset/` changes):
    1. **Mastery ring was missing on grammar cards**: `QuizCard`/`MeaningQuizCard` show a `MasteryRing` reflecting the vocab's own SRS progress; `GrammarIntroCard`/`GrammarQuizCard` showed nothing equivalent for the grammar point's `SRSEntry` (`GrammarProgress.entry`). Added a top-right `MasteryRing` to both, reading `currentGrammarProgress?.entry.memoryStrength ?? 0` (the `useQuiz()` field the orchestration layer already exposed) - `0` on the intro card, since an intro candidate has no `GrammarProgress` entry yet, same as vocab's intro flow.
    2. **`formation` visibility on the quiz card**: re-checked against the current code - `GrammarQuizCard` was already not rendering `grammarPoint.formation` (only `GrammarIntroCard` does, appropriately, since that's the "here's what you're about to learn" screen). No code change was needed; documented explicitly here and in Application Pages so this doesn't get re-flagged.
    3. **Revealing a blank's answer graded too harshly relative to intent**: `gradeGrammarAnswers` forced a revealed blank (`hintLevel >= 2`) to `'pass'` (`CONSTANTS.srs.formula.resultFactors.pass`, -0.15). Changed to `'minor_error'` (+0.10) - reading the answer still leaves some impression, so it's graded the same as a near-miss instead of as a full skip. The worst-of combiner's precedence itself is unchanged (`wrong` > `pass` > `minor_error` > `correct`) since `'pass'` is still independently reachable - `SRSService.analyzeError` grades a literal typed "pass" as `'pass'` regardless of the hint system, mirroring vocab's reading quiz - it's just no longer what a revealed hint forces. Test coverage in `grammarSelectors.test.ts` updated: the revealed-blank test now asserts `'minor_error'`, and the worst-of precedence block's `'pass'` cases now drive it via a literal typed `"pass"` input instead of a revealed hint, plus a new case confirming a revealed (`minor_error`) blank still beats a correct one.
    - Verified: `bun run typecheck` (only the pre-existing `vite-plugin-checker` peer-dependency errors), `bun run test` (341 tests, all passing), `bun run lint` (only pre-existing `no-explicit-any` debt, none in the touched files), `bun run build` (clean, dataset submodule initialized read-only to verify - no submodule content changed).

  - **Grammar quiz now prioritizes the core grammatical formation over incidental vocabulary** (follow-up to issue #17/#32, resolved decision from a deeper pedagogical review): manual testing surfaced that with near-zero known vocab, the quiz just prompted for generic filler words (e.g. "he"/"she", from `pickMostFrequentCandidate`'s frequency fallback landing on common pronouns unrelated to the grammar point being studied) instead of testing the point's actual construction (e.g. が いちばん for the superlative pattern). Since there is exactly one `SRSEntry` per grammar point, what gets graded has to consistently reflect grammar-point recall or the schedule that entry drives doesn't mean what it claims to.
    - **Investigated whether the pattern's literal markers can be reliably located per example** rather than theorized about: built and iteratively hardened a pattern-locator (`gokan-dataset`'s new `dataset/scripts/grammar-pattern-matcher.ts`) directly against the real compiled data, starting from a naive 65.4%-of-examples match rate and fixing real bugs at each step (span-length cap too low for multi-token literals, parentheticals inflating required occurrence counts, unsplit formation alternatives, conjugation-descriptor terms wrongly extracted as literals, all-or-nothing per-variant matching failing on partial literal matches, mixed surface/baseform token requirements, short literals claiming a token index before a longer fused literal could, substring matching too narrow to catch fused suffixes) - reaching 98.1% of examples / 99.0% of points from general engineering improvements alone. The residual 8 points had inaccurate `formation` text (didn't actually describe their own examples) rather than an unsolvable matching problem, and were corrected directly in the dataset (we own it) - one exception remains undocumented as locatable (`n1-178`, a genuine conjugation-transformation point with no literal marker shared across its own examples), landing at **99.9% of points / 98.1% of examples** with the exception documented in `gokan-dataset#2`.
    - **New dataset fields** (`gokan-dataset`, synced through as normal): `GrammarExampleWord.baseForm` (kuromoji's dictionary form, e.g. `思う` for the conjugated surface `思っ` - previously discarded, now captured since the matcher needs it to match conjugated verbs against a formation's dictionary-form description) and `GrammarExample.patternWordIndices` (indices into `words[]` identifying the example's literal grammar-pattern markers, precomputed at build time so `gokan-srs` never re-derives it at runtime - always present, possibly empty for the one exception).
    - **`computeBlankPlan` (`grammarSelectors.ts`) rewritten from a 3-pass vocab-only priority to a 4-pass pattern-primary priority**: (1) PRIMARY - an example with non-empty `patternWordIndices` blanks those markers unconditionally regardless of vocab knowledge, with any other known word in the same example layered in as secondary reinforcement (vocab recall stays part of the exercise, never at the expense of the pattern); (2) FALLBACK - pattern not locatable for this point at all (the ~0.1%-of-points exception): the original vocab-only "blank every known word" behavior, demoted from primary to a residual fallback; (3) FALLBACK - no known vocab either: blank the single most frequent candidate, same as before, so there's still something answerable; (4) no blankable word at all: a read-only plan (no Submit step) rather than silently auto-granting SRS credit for an empty answer.
    - **Scope note, flagged explicitly rather than assumed**: the user's ask also mentioned testing word *arrangement* ("make him arrange the word order around this concept") as a second goal alongside core-pattern recall. This round only implements the pattern-recall priority (what gets blanked); `GrammarQuizCard` still renders every blank in fixed canonical sentence position, so word order itself is not yet a graded dimension - order-sensitive grading (e.g. cluster-based positional scoring) is a separate, harder mechanic that was not built here and would need its own design pass if wanted.
    - Test coverage: `grammarSelectors.test.ts` gained a `PRIMARY: pattern-word blanking` block (7 new tests - unconditional pattern blanking regardless of known vocab, null-progress safety, pattern priority over vocab-only blanking, known-vocab layering with correct sort order, no double-counting when a pattern word is also a known vocab id, unknown vocab staying pre-filled, and the fallback path when `patternWordIndices` is empty); all existing fixtures updated with the new required field. `bun run typecheck`/`test`/`build` all pass (339 tests).

- **[2026-08-05]**:
  - **Grammar quiz UX fixes from manual testing feedback** (issue #32, on top of the Grammar activity added earlier the same day - see the entry directly below): six app-only fixes, none touching the `dataset/` submodule, all data already present in the compiled grammar files or reachable via `VocabularyService`.
    1. **Blank input sizing leaked the answer length**: `GrammarQuizCard`'s per-blank `<input>` was sized from `expected.length` (frozen, and told the user how many characters to type). Now sized from the live typed value (`Math.max(4, value.length + 1)ch`), growing as the user types.
    2. **Kanji-form answers were marked wrong**: grading compared the typed answer against a single string (`word.reading ?? word.surface`), so typing the kanji form shown in the sentence failed whenever a reading existed - measured at 72.3% of blank-eligible word instances (`surface !== reading`). Fixed by grading against an accept-list (`SRSService.evaluateAnswer`, the same call the vocab reading quiz uses) built by `computeBlankPlan` at load time, seeded with `[word.reading, word.surface]` at minimum.
    3. **Rarer spelling variants weren't accepted**: extended the same accept-list with a `VocabularyService.loadVocab(word.vocabId)` fetch per blank (cached, done once at card-load time so grading stays synchronous) - `writtenForm.kanji`/`alternatives`, `reading.primary`/`alternatives`, and any `mergedVocabs` readings. E.g. 寿司 now also accepts 鮨, 鮓, 寿し, 壽司, 壽し.
    4. **No way to give up on a blank**: added a per-blank progressive hint (`grammarHintLevels`, capped at 2) - first activation shows the word's English gloss (from the same vocab fetch), second reveals the answer and grades that blank as `'pass'` (`CONSTANTS.srs.formula.resultFactors.pass`, -0.15) regardless of what was typed, rather than `'correct'` or `'wrong'`. Threaded through `gradeGrammarAnswers`'s worst-of combiner with precedence `wrong > pass > minor_error > correct`, matching the SRS factors' ordering.
    5. **Blanking every word when nothing was known yet**: `computeBlankPlan`'s old fallback (`knownIndices.length > 0 ? knownIndices : candidateIndices`) blanked **every** content word the moment zero words were known - measured at up to 17.1% of examples for a learner with 300 known words, averaging 3.8 blanks each, and the single biggest cause of the quiz feeling impossible during testing. Replaced with a three-pass rule (see State Management → Grammar Activity State): prefer a different example of the same point that has a known word; else blank exactly the single most-frequent candidate (`frequency.kanjiRank`, lowest wins) rather than all of them; the new per-blank hint (item 4) keeps that single blank always escapable.
    6. **Two specific examples produced an unanswerable auto-correct**: `n4-014` example 2 and `n5-113` example 0 resolve zero words to a vocab id, so `blankWordIndices` was `[]` - `canSubmitGrammar`'s `.every()` and the combiner's `.some()` both vacuously pass on an empty array, silently granting a free correct answer with no inputs rendered. Fixed at the source: `computeBlankPlan` now skips a zero-candidate example in favor of another example in the same point (this alone already fixes both cited examples, since their sibling examples do have candidates), and only falls through to a `readOnly: true` plan if literally no example in the whole point has a single blankable word - `GrammarQuizCard` renders that as read-only study material with a Continue-only button, and `continueGrammarToNext()` calls a new `GrammarSRSService.deferWithoutCredit()` (reschedules `dueDate` without touching `memoryStrength`/`interval`/`difficulty`) instead of `applyAnswer()`, so it's a real no-credit path rather than a disguised auto-pass. `canSubmitGrammar` also now requires `blankWordIndices.length > 0` directly, as a second independent guard.
    - Test coverage added to `grammarSelectors.test.ts`: the example-preference and single-most-frequent fallback (items 5), the zero-candidate skip and read-only plan (item 6), accept-list construction including the failed-fetch fallback and vocab-variant/gloss resolution (items 2-3), and `gradeGrammarAnswers`'s worst-of precedence including the revealed-blank-forces-pass rule (item 4). `bun run typecheck`/`test`/`lint`/`build` all pass at the same baseline as the entry below (no new failures).

  - **Add Grammar learning activity (SRS-based)** (issue #17): New second SRS-driven activity alongside the vocab quiz - JLPT-level grammar points with a fill-in-the-blank English→Japanese translation exercise, reusing `srs.service.ts`'s formula rather than a new algorithm, per the issue's resolved decisions.
    - **Architecture decision (not explicitly resolved by the issue, but flagged there as an implementation-time detail)**: the issue's data section assumed the same ingestion shape as vocab (raw data building via `gokan-dataset`). The agent that first implemented this issue found its git credentials (a per-repo GitHub App installation token, scoped only to `gokan-srs`) had no push access to the separate `gokan-dataset` repo, and vendored the raw snapshot and compiled output directly into `gokan-srs` instead as a workaround - since fixed (below) to follow the vocab convention properly, once a maintainer could push to `gokan-dataset` on the agent's behalf. If this needs revisiting (e.g. a future agent needs its own `gokan-dataset` credentials), see Build & Development → Grammar Dataset.
    - **Fix (same day, before merge)**: the vendored-inside-`gokan-srs` copy (`scripts/grammar/raw/`, `scripts/build-grammar.ts`, committed `public/data/grammar/`) was moved into `gokan-dataset` proper - `data/raw/grammar/`, `scripts/build-grammar.ts`, `compiled/grammar/` - matching every other dataset. `grammar.service.ts` now fetches from `/data/compiled/grammar/...` (synced automatically like vocab/kanji/sentences) instead of `/data/grammar/...`; the app's `build:grammar` script and `kuromoji` devDependency (unused once the build script moved out) were updated/removed accordingly. See Build & Development → Grammar Dataset for the corrected architecture.
    - **Data**: vendored `hanabira.org-japanese-content` (CC license, credited on the About page) - 828 grammar points across N5-N1. `build-grammar.ts` assigns stable ids (`n5-001`, ...) and tokenizes every example sentence with kuromoji (a `gokan-dataset` devDependency, self-contained dictionary), resolving each content word against the vocab dataset's `search.json` so the quiz can later decide, per-user, which words are already known. Output mirrors the vocab convention (`points/{id}.json`, `index/jlpt.json`); `bun run --cwd apps/gokan-srs build:grammar` to refresh (delegates into the submodule, then re-syncs).
    - **Models** (`grammar.model.ts`): `GrammarPoint`/`GrammarExample`/`GrammarExampleWord` (build-time data) and `GrammarProgress` (user SRS state - a single `entry: SRSEntry` and single `needsRetry?: boolean`, since grammar has exactly one quiz type, unlike vocab's reading/meaning split). `UserProgress` gained `grammarQueue: GrammarProgress[]`, additive and defaulted via `DEFAULT_PROGRESS`/hydration/migration rather than a version-gated migration pass.
    - **Services**: `grammar.service.ts` (loading, mirrors `vocabulary.service.ts`), `grammarScheduling.ts` (mirrors `scheduling.ts` for the single-entry case), `grammarSrs.service.ts` (mirrors `srs.service.ts`'s orchestration - JLPT-order-only queue refill since grammar has no frequency data, `applyAnswer` taking an already-combined per-blank result). `SRSService.calculateNextState` was made `static` (non-private) specifically so `grammarSrs.service.ts` can reuse the exact same formula instead of re-deriving it.
    - **Sync/migration**: `mergeProgress.ts` gained `mergeGrammarProgress`/`mergeGrammarQueues` (mirrors the vocab merge functions, reusing `mergeEntry` directly since there's only one entry) wired into the top-level `mergeProgress`. `migration.service.ts` fills `grammarQueue` defaults and re-derives `nextReviewAt` unconditionally, same as vocab, but needs no version gate since the field is purely additive.
    - **State**: Grammar's state lives in the **same** `QuizState`/`QuizProvider` as vocab rather than a second context - `grammarQueue` lives on the same `UserProgress` object `useQuizOrchestration`'s persistence/Drive-sync effects already key off generically, so a second provider would race it. `grammarReducer.ts`/`grammarSelectors.ts`/`useGrammarOrchestration.ts` hold the grammar-specific logic; `quizReducer.ts`'s top-level reducer delegates to `grammarReducer` for every `GRAMMAR_`-prefixed action via `isGrammarAction()`. `computeBlankPlan` (in `grammarSelectors.ts`) is the key selection rule: blank every word already resolved to a known vocab (introduced in `learningQueue`), or fall back to blanking every content word if none are known yet, so the exercise is never trivially all-pre-filled for a learner early in their vocab journey. Deliberately did **not** build session-progress-bar parity (vocab's frozen `session.committed` counter) for grammar in v1 - a reasonable, explicitly-scoped reduction, not an oversight.
    - **UI**: new `/grammar` route (`GrammarScreen`, `GrammarIntroCard`, `GrammarQuizCard`), plus a "Grammar quiz session" card on the Main hub (`MainScreen.tsx`'s preview-description logic extracted into a shared `renderSessionPreviewDescription` helper so both activity cards use it instead of duplicating it). `GrammarQuizCard` renders the sentence as literal text interspersed with per-blank `<input>`s sized to the expected answer, doesn't reuse `BaseQuizCard` (single-input-specific), and shows each blank's own correctness on feedback via a `perBlankResults` array threaded through `GRAMMAR_SUBMIT_ANSWER`.
    - **Verified via a scripted headless-Chromium pass** (playwright-core over CDP against the system Chromium binary, since no project run-skill or downloadable browser was available in this environment - matches the approach used for the `[2026-08-04]` verification): fresh "beginner" onboarding → Main hub shows both "Vocabulary quiz session" and "Grammar quiz session" cards → grammar intro card (title, JLPT chip, formation) → learned through the 3-item intro batch → multi-blank quiz card ("Translate into Japanese" + English prompt + Japanese sentence with 3 blanks, since no vocab was known yet - the blank-everything fallback correctly kicked in) → submitted deliberately-wrong answers → "Incorrect." feedback correctly revealed each blank's expected reading → Continue correctly advanced to the next grammar point's first review. No console errors throughout. This pass caught one real bug before it shipped: the intro card's title used `font-serif` (no CJK glyph fallback at all) instead of `font-mincho`, rendering Japanese characters as tofu boxes - fixed. `bun run typecheck`/`test`/`build` all pass (312 tests, 54 new); `bun run lint` has the same pre-existing failures documented in prior entries (the `dataset/**` submodule + long-standing `no-explicit-any`/`react-hooks/purity` gaps present on `main` before this work), plus a small number of new instances that each directly mirror an adjacent pre-existing instance in the same file for the same reason (e.g. `GRAMMAR_LOAD_ERROR`'s `error: any` mirrors `LOAD_VOCAB_ERROR`'s; `GrammarScreen`'s `Date.now()`-in-render mirrors `WaitingScreen.tsx`'s identical pattern) - not a new category of lint debt.

- **[2026-08-04]**:
  - **Enrich the home page: next-session counter + daily activity card, replacing the session recap** (issue #30): The Main hub (`[2026-08-02]`) was very sparse - one activity card with no sense of how much work was waiting, and a session recap that got clobbered by the next session, so several small sessions a day rarely reflected a full day's work. Three changes, all backed by data already in `progress.learningQueue` - no new persistence, no dataset work.
    - **Next-session counter**: new `selectNextSessionPreview(state, now)` in `quizSelectors.ts` returns `{ review, new, retries }`, bucketed per distinct vocab in `learningQueue` (`stage !== 'graduated'`), mutually exclusive with first match winning: `retries` (a pending `needsRetry.reading`/`needsRetry.meaning`) beats `new` (`totalReviews === 0`, i.e. queued but never reviewed - bounded to what's already in the queue, not the unbounded auto-intro pool) beats `review` (due now, reusing `isReadingActionable`/`isMeaningActionable` from `srs.utils.ts` rather than reimplementing due-ness - by the time an item reaches this branch the retry/first-review cases are already excluded, so those predicates can only match their "due" branch). Counts distinct vocab (words), not individual reading/meaning tasks, since the 12h reading→meaning stagger means both rarely surface for the same word at once. Exposed via `useQuizOrchestration`/`QuizContextValue` as `nextSessionPreview`, alongside `sessionStats`. `MainScreen`'s quiz activity card renders `"{review} review · {new} new"`, appending `· {retries} retries` (in the error color) only when `retries > 0`, and falling back to a caught-up message (with the next review's ETA when known) when all three are 0.
    - **Daily activity card**: new `pages/main/DailyActivityCard.tsx` replaces `SessionRecapCard` on the Main hub - a **today** rollup (reviewed / correct / incorrect) plus a compact 7-day bar chart. Extracted the per-day bucketing that used to live inline in `DailyProgressionChart` into a shared `buildDailyActivity(progress, days, now?)` (`utils/activity.utils.ts`, excludes `pass`, groups `correct`/`minor_error` as correct and `wrong` as incorrect) so the Stats-page chart and the new home card share one source of truth instead of duplicating the aggregation. Reading persisted `reading.history`/`meaning.history` logs (rather than ephemeral session state) makes the card robust to however many small sessions happen in a day.
    - **Removed the session-recap machinery**: `state.lastSessionRecap`, the `DISMISS_SESSION_RECAP` action, `actions.dismissSessionRecap()`, and `SessionRecapCard` are gone. `SESSION_END` no longer snapshots a recap - it just clears `session`. The `session.reviewed`/`correct`/`incorrect` running tally (added `[2026-08-02]` specifically to feed the recap) was removed too, since nothing else read it; `SessionTracking` is back to just `{ committed: TaskKey[] }`. The frozen `session.committed` task set backing the live in-session progress counter (`SessionProgress`) is a separate concern and was untouched.
    - Verified manually via a scripted browser pass (system Chromium driven over CDP with `playwright-core`, since neither a project run-skill nor a downloadable browser was available in this environment): fresh "beginner" account → Main hub shows "You're all caught up" (an empty queue has no review/new/retries) → unlock kanji → learn 3 words → answer one reading wrong → navigate back to the hub → quiz card now reads "0 review · 2 new · 1 retries" (retries in the error color) and the daily card shows "1" reviewed / "0 correct · 1 incorrect" with a matching bar in today's column. No console/page errors. `bun run typecheck`/`test`/`build` all pass; `bun run lint` has pre-existing failures unrelated to this change (same `dataset/**` submodule + long-standing `no-explicit-any` gap present on `main` before this work - not part of issue #30's scope).

  - **Production Terraform brought under CI + state migrated off local machine**: The production stack (`apps/gokan-srs/terraform/main.tf`, the live gokan-srs.com S3 + CloudFront + ACM + Route53 site) was previously applied by hand from a single developer PC with local state (`terraform.tfstate`) and a hardcoded `profile = "terraform-deploy"`. This blocked CI from managing production infra. Now mirrored on the staging stack's established pattern:
    - `main.tf`: replaced the commented-out backend stub with a real `backend "s3"` block (`key = "production/terraform.tfstate"`, `region = eu-west-3`, `encrypt`, `use_lockfile` native locking; **partial config**, so the account-specific state-bucket name is injected at `terraform init` via `-backend-config="bucket=$TF_STATE_BUCKET"` and never committed). Bumped `required_version` to `>= 1.10` (native S3 locking). Removed the hardcoded `profile` from both providers so credentials come from the environment (CI: the `gokan-terraform-ci` user's `TF_AWS_*` secrets; local: `AWS_PROFILE=terraform-deploy`).
    - New `.github/workflows/terraform-production.yml`: mirror of `terraform-staging.yml` (plan-on-PR, apply-on-`workflow_dispatch`, `TF_AWS_*` creds, `TF_STATE_BUCKET` var). Path filter is deliberately the **top-level** terraform files only (`apps/gokan-srs/terraform/*.tf`, non-recursive) so it never overlaps the staging workflow's `terraform/staging/**` trigger. The apply job carries the same optional `environment: production-infra` approval-gate comment as staging, called out more strongly since this is the live site.
    - Production and staging share one state bucket (`TF_STATE_BUCKET`), separated by key (`production/…` vs `staging/…`).
    - The one-time local state migration (`terraform init -migrate-state -force-copy -backend-config="bucket=gokan-srs-state"` with `AWS_PROFILE=terraform-deploy`) uploaded the existing local state (serial 18) to `s3://gokan-srs-state/production/terraform.tfstate`. Content deploys are unchanged: `deploy.yml` still handles the production app content push on push-to-main, `deploy-staging.yml` the RC-tag staging push.
    - **Config-vs-reality drift found and reconciled during migration**: the drift-check `terraform plan` after migration was NOT a no-op: live production had two console-created security features the committed `main.tf` never captured, so an apply would have silently removed them: (1) a `aws_cloudfront_response_headers_policy.security_headers` (HSTS/frame-options/XSS/etc., currently **unattached** to the distribution so no live effect yet) that plan wanted to **destroy**, and (2) a WAF WebACL (`CreatedByCloudFront-*`) attached via `web_acl_id` that plan wanted to **detach**. Both are now represented in `main.tf` (the response-headers policy reconstructed from state; the WAF ARN as `var.cloudfront_web_acl_arn`, defaulting to the live association) so `terraform plan` is a clean no-op. The WebACL itself is not Terraform-managed (referenced by ARN only). Open follow-up: the security-headers policy is defined but not wired into `default_cache_behavior.response_headers_policy_id`, so it enforces nothing yet: attaching it is a deliberate future change.
    - **Security note (unrelated to CI, pre-existing)**: the local `terraform-deploy` profile authenticates as the AWS account **root** user (root access keys on the dev machine). Worth rotating to a scoped IAM user.

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
- **[2026-02-01]**:
  - **Refined Retry Mechanism**: Modified `SRSService.applyAnswer` to treat retries as "training runs".
    - Successful retries now clear the `needsRetry` flag but **do not** update SRS intervals or memory strength.
    - This preserves the scheduling penalty from the initial wrong answer while allowing the user to practice the correct answer immediately.
    - Updated tests to verify SRS state invariance during retries.
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
