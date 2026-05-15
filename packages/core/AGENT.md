# @gokan-srs/core — Agent Context

> [!IMPORTANT]
> This package contains **all platform-agnostic business logic**.
> It has **no React dependency**. Services receive platform capabilities via injected adapters.
> See the root [`AGENT.md`](../../AGENT.md) for the full project overview.

## Package Structure

```
packages/core/src/
├── adapters/
│   ├── fetch.adapter.ts         # FetchAdapter interface + web default
│   └── storage.adapter.ts       # StorageAdapter interface + localStorage default
├── commons/
│   ├── constants.ts             # All SRS limits, timing, storage keys
│   └── theme.ts                 # THEME color/font tokens (consumed by @gokan-srs/ui)
├── models/
│   ├── vocabulary.model.ts      # Vocabulary, VocabProgress, SRSEntry
│   ├── user.model.ts            # UserProgress, UserSettings, KanjiKnowledge
│   ├── sentence.model.ts        # Sentence, SentenceSet
│   ├── state.model.ts           # SessionState type
│   ├── index.model.ts           # Index file shapes
│   ├── kanji.model.ts           # KanjiEntry
│   └── data.model.ts            # External dataset DTOs (JMDict, JPDB)
├── services/
│   ├── srs.service.ts           # SRS algorithm (core of the system)
│   ├── vocabulary.service.ts    # Load vocab/index JSON via FetchAdapter
│   ├── storage.service.ts       # Read/write progress & settings via StorageAdapter
│   ├── google.service.ts        # Google Drive sync (GoogleDriveSync class)
│   ├── migration.service.ts     # Data format upgrades (versioned migrations)
│   ├── llm.service.ts           # Gemini API calls for meaning context validation
│   └── quiz.service.ts          # Quiz utility helpers
└── utils/
    ├── srs.utils.ts             # getNextVocabToStudy, computeSessionView, QuizItem
    └── quiz.utils.ts            # Answer normalization helpers
```

---

## Platform Adapters

The adapter pattern decouples core services from platform-specific APIs.

### `StorageAdapter` (`adapters/storage.adapter.ts`)

```typescript
interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
```

| Platform | Implementation |
|---|---|
| Web | `localStorageAdapter` (wraps `window.localStorage`) — defined in this file |
| Mobile | `mmkvStorageAdapter` (wraps `react-native-mmkv`) — defined in `apps/mobile/src/services/mmkv.adapter.ts` |

**Usage**: Call `StorageService.configure(adapter)` once at app startup before any other calls.

### `FetchAdapter` (`adapters/fetch.adapter.ts`)

```typescript
interface FetchAdapter {
    fetchJson<T>(path: string): Promise<T>;
}
```

| Platform | Implementation |
|---|---|
| Web | `createWebFetchAdapter(baseUrl)` — uses browser `fetch`, default base `/data/compiled` |
| Mobile | `createNativeFetchAdapter()` — reads bundled assets via `expo-file-system` (Android: `file:///android_asset/data/compiled/…`, iOS: `bundleDirectory/data/compiled/…`) — defined in `apps/mobile/src/services/fetch.adapter.native.ts` |

**Usage**: Call `VocabularyService.configure(adapter)` once at app startup.

---

## Core Data Models

### `Vocabulary` (`vocabulary.model.ts`)
- `id`: JMdict word ID (stable)
- `writtenForm`: primary kanji form + contained kanji chars + alt writings
- `reading`: primary reading + alternatives
- `frequency`: `{ kanjiRank, kanaRank? }`
- `progression.kklcStep`: KKLC step requirement (99999 if outside KKLC index)
- `components[]`: vocab IDs contained within this word
- `parents[]`: vocab IDs that contain this word (inverse of `components`)
- `senses[]`: array of meanings `{ pos, glosses, misc, appliesToReadings? }`
- `mergedVocabs?`: source JMDict entries merged into this unified entry
- `usageHints?`: optional context hints

### `VocabProgress` (`vocabulary.model.ts`)
- `vocabId`: reference to `Vocabulary.id`
- `stage`: `'learning'` | `'graduated'`
- `introductionAt`: when user first saw this vocab (`null` = never shown)
- `nextReviewAt`: next scheduled review (`null` = new item)
- `lastReviewedAt`: last review timestamp
- `totalReviews`: total reviews performed
- `consecutiveFailures`: consecutive wrong answers
- `needsRetry`: item should reappear in current session
- `reading`: `SRSEntry` for reading quiz
- `meaning`: `SRSEntry` for meaning quiz

### `SRSEntry` (`vocabulary.model.ts`)
- `memoryStrength`: current memory strength in days
- `interval`: current scheduled interval in days
- `difficulty`: 0.0 (hard) → 1.0 (easy), default 0.3
- `dueDate`: ISO string when next review is due
- `history[]`: array of `ReviewLog` entries

### `UserProgress` (`user.model.ts`)
- `kanjiKnowledge`: `KanjiKnowledge`
- `learningQueue`: `VocabProgress[]` (all vocab ever introduced)
- `stats`: `{ newLearnedToday, totalLearned, totalReviews }`
- `dailyOverride`: bypass daily new vocab limit
- `_formatVersion`: migration version number

### `UserSettings` (`user.model.ts`)
- `preferredLearningOrder`: `'kanji_coverage'` | `'frequency'` | `'kklc'`
- `kanjiCoverageTarget`: 1–5 (words per kanji before falling back to frequency)
- `learningFrequency`: `'high'` | `'medium'` | `'low'`
- `enableMeaningQuiz`: boolean (default `true`)
- `geminiApiKey?`: optional Gemini API key
- `enableGeminiContext`: boolean (default `false`)
- `alwaysUseAiForMeaningContext`: boolean (default `true`)
- `meaningContextThreshold`: `'early'` | `'normal'` | `'late'` (default `'normal'`)

### `KanjiKnowledge` (`user.model.ts`)
- `method`: `'kklc'` | `'rtk'` | `'jlpt'` | `'custom'`
- `step`: numeric step/count
- `kanjiSet`: `Set<string>` of known kanji characters

### `SessionState` (`state.model.ts`)
`'review'` | `'learn'` | `'waiting'` | `'exhausted'`

---

## Services

### SRS Service (`srs.service.ts`) — Core of the System

**`evaluateAnswer(userInput, readings)`**
- Checks input against all acceptable readings (hiragana)
- Returns best: `'correct'` > `'minor_error'` > `'wrong'`
- Uses Levenshtein distance for typo tolerance

**`evaluateMeaning(userInput, meanings)`**
- Normalizes input (lowercase, strip punctuation, strip articles a/an/the/to)
- Fuzzy match via Levenshtein; handles synonyms and comma-separated lists
- Returns `'correct'` | `'minor_error'` | `'wrong'`

**`applyAnswer(vocab, userAnswer, correctAnswer, latencyMs, now, forcedResult?)`**
- Updates `VocabProgress` based on result
- Returns updated progress + result + interval
- Takes `quizType` (`'reading'` | `'meaning'`) and `quizMode` (`'base'` | `'context'`)
- `meaning_context` uses `expectedLatency = 15s`; `reading`/`meaning_base` use `10s`
- Retries: if `needsRetry` is `true`, a correct answer clears the flag but **does NOT update SRS state** (training only)
- Meaning stagger: after a successful reading review, meaning `dueDate` is pushed +12h if it would be due within 12h (prevents same-session duplicates)

**`calculateNextState(entry, result, latencyMs, now)`**
- Core SRS formula
- Adjusts `memoryStrength` by result factor × latency multiplier × difficulty
- Returns new `SRSEntry` + interval

**`applyVocabIntroChoice(progress, choice)`**
- `'learn'`: sets `nextReviewAt = now` (becomes immediately reviewable), stagger meaning +12h
- `'skip'`: sets `stage = 'graduated'`, `memoryStrength = maxMemoryStrength`

**`refillQueue(currentQueue, kanjiKnowledge, settings, maxToAdd, ignoredIds)`**
- Adds new vocabulary to learning queue respecting kanji knowledge constraints
- Ordering: `kanji_coverage` (Set Cover heuristic) | `frequency` | `kklc`
- `kanji_coverage` score: `(coverage * 2500) - frequencyRank`

#### SRS Constants (`commons/constants.ts`)
- `targetRecall`: 0.75
- `minInterval`: 0.2 days (~5h), `maxInterval`: 3650 days
- `maxMemoryStrength`: 1270 (≈1 year = mastery)
- `resultFactors`: correct +0.25, minor_error +0.10, wrong -0.40, pass -0.15
- `dailyNewLimit`: 20, `newVocabBatchSize`: 3, `maxReviewsPerDay`: 150
- `meaningContextThresholds`: `{ early: 30, normal: 50, late: 70 }` (mastery %)
- `correctAnswerAutoAdvanceDelay`: 1800ms, `incorrectAnswerRevealDelay`: 400ms
- `progressStorageKey`: `"GOKAN_SRS_PROGRESS"`, `settingsStorageKey`: `"GOKAN_SRS_SETTINGS"`
- `googleDriveFileName`: `"kanji-progress.json"`

### Vocabulary Service (`vocabulary.service.ts`)
- `VocabularyService.configure(fetchAdapter)`: **must be called once at startup**
- `loadKKLCKanjiIndex()`: step → kanji[]
- `loadKKLCIndex()`: step → vocabIds[]
- `loadFrequencyIndex()`: frequency-sorted vocabIds[]
- `loadVocab(id)`: load + cache individual vocab by ID
- Data at `data/compiled/` (web: served as static files; mobile: bundled in app assets)

### Storage Service (`storage.service.ts`)
- `StorageService.configure(storageAdapter)`: **must be called once at startup**
- `loadProgress()` / `saveProgress(progress)`
- `loadSettings()` / `saveSettings(settings)`

### Google Service (`google.service.ts`)
- `GoogleDriveSync` class (initialized with OAuth `access_token`)
- `sync(envelope)`: upload local state, download remote, merge (server wins for most fields; local wins for KanjiKnowledge deletions)
- `initialize()`: first-time download when no local data exists
- Integrated migration: applies `MigrationService` + date hydration to remote files before merge
- Optimistic versioning to prevent race conditions on rapid saves

### Migration Service (`migration.service.ts`)
- `needsMigration(progress)`: check if data needs upgrade
- `migrateMergedVocabsAsync(progress)`: async migration (V5 — homograph merge)
- Converts old `mastery` (0–100) → `memoryStrength`/`interval`
- Handles merged vocab IDs: updates IDs, merges history, takes max `memoryStrength`
- Idempotent; tracks version in `_formatVersion`

### LLM Service (`llm.service.ts`)
- `LLMService.validateMeaningContext(apiKey, sentence, targetWord, userAnswer, meanings)`
- Calls Gemini API to validate meaning answers in context mode
- Can return `'correct'` | `'minor_error'` | `'wrong'`
- On network error (400/500): caller falls back to strict evaluation result silently

---

## Utils

### `srs.utils.ts`
- `getNextVocabToStudy(queue, settings, now)`: returns `QuizItem | null`
  - Priority: Old Reviews + Retries > New Intros > First Reviews
  - Determines `quizType` (`reading` | `meaning`) and `quizMode` (`base` | `context`)
  - `context` mode unlocked when `meaning.memoryStrength` visual mastery ≥ threshold
- `computeSessionView(queue, settings, stats, now)`: returns `SessionState`
- `QuizItem`: `{ vocab, progress, quizType, quizMode, sentence? }`

### `quiz.utils.ts`
- Answer normalization helpers shared by `evaluateAnswer` and `evaluateMeaning`
