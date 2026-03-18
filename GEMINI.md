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

Refer to [DESIGN_SYSTEM.md](file:///c:/Programmation/Personnel/gokan-srs/DESIGN_SYSTEM.md) for full details.

### Key Principles
- **Tone**: Neutral, Direct, Encouraging (no cheerleading)
- **Visuals**: Minimize colors. Use Primary Accent (Indigo #2E3A59) for focus. Use Secondary Accent (Muted Vermilion #8A3A2E) ONLY for errors/warnings
- **Typography**: Source Serif 4 + Inter for English, Noto Serif JP + Noto Sans JP for Japanese
- **Animations**: Minimal (150-200ms), no bounce, ease-in-out only

---

## Project Structure

```
gokan-srs/
├── data/                      # Vocabulary data (compiled JSON)
│   └── compiled/
│       ├── index/            # KKLC & frequency indexes
│       └── vocab/            # Individual vocabulary files (by ID)
├── public/                    # Static assets
├── scripts/                   # Build scripts for data compilation
│   ├── build-kanji.ts        # Compile KKLC kanji data
│   ├── build-vocabulary.ts   # Compile JMDict vocabulary
│   └── jpdb-v2.2-tsv-to-json.js
├── src/
│   ├── assets/               # Images, fonts
│   ├── commons/              # Shared constants
│   │   └── constants.ts      # App-wide configuration
│   ├── components/           # Reusable UI components
│   ├── context/              # React Context providers
│   │   ├── QuizContext.tsx   # Main app state
│   │   ├── GoogleDriveContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── KanjiForm/        # Kanji knowledge form state
│   │   └── Responsive/       # Responsive utilities
│   ├── models/               # TypeScript interfaces
│   │   ├── vocabulary.model.ts
│   │   ├── user.model.ts
│   │   ├── data.model.ts     # External dataset DTOs
│   │   ├── index.model.ts
│   │   ├── state.model.ts
│   │   └── kanji.model.ts
│   ├── pages/                # Page components
│   │   ├── quiz/             # Main study screen
│   │   ├── setup/            # Initial setup wizard
│   │   ├── settings/         # App settings
│   │   ├── profile/          # User profile
│   │   └── about/            # About page
│   ├── services/             # Business logic
│   │   ├── srs.service.ts    # SRS algorithm
│   │   ├── vocabulary.service.ts
│   │   ├── storage.service.ts
│   │   ├── google.service.ts
│   │   └── quiz.service.ts
│   ├── utils/                # Helper functions
│   │   ├── srs.utils.ts
│   │   └── quiz.utils.ts
│   ├── App.tsx               # Root component with routing
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── DESIGN_SYSTEM.md          # Visual design guidelines
├── GEMINI.md                 # This file
└── package.json
```

---

## Core Data Models

### Vocabulary (`vocabulary.model.ts`)

**`Vocabulary`** - Represents a Japanese word/phrase
- `id`: JMdict word ID (stable identifier)
- `writtenForm`: Kanji form + contained kanji characters
- `reading`: Primary reading + alternatives
- `frequency`: Kanji rank + optional kana rank
- `progression.kklcStep`: KKLC step requirement
- `components[]`: IDs of other vocabularies contained within this one
- `senses[]`: Array of meanings with POS, glosses, misc tags
- `usageHints`: Optional context hints

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
- `preferredLearningOrder`: `'kanji_coverage'` | `'frequency'` | `'kklc'`
- `kanjiCoverageTarget`: 1 to 5 (how many words to learn per known kanji before prioritizing new words, default 1)
- `learningFrequency`: `'high'` | `'medium'` | `'low'`

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

**`applyVocabIntroChoice(progress, choice)`**
- Handles "Learn" or "Skip" on intro card
- **Learn**: Sets `nextReviewAt = now` (becomes immediately reviewable)
- **Skip**: Sets stage to `'graduated'`, maxMemoryStrength (never appears again)

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

**Data Location**: `data/compiled/`
- Indexes: `index/kklc.json`, `index/kklc-kanji.json`, `index/frequency.json`
- Vocabulary: `vocab/{id}.json` (one file per vocab item)

### Storage Service (`storage.service.ts`)

Local storage wrapper for user data persistence.

**Keys** (from `constants.ts`):
- `GOKAN_SRS_PROGRESS`: User progress data
- `GOKAN_SRS_SETTINGS`: User settings

### Google Service (`google.service.ts`)

Google Drive integration for cloud sync.

**Features:**
- OAuth authentication
- Create/update progress file in Google Drive
- Automatic sync on changes
- Conflict resolution (server wins)
- **Integrated Migration**: Applies migration and proper date hydration to remote files before merging

### Migration Service (`migration.service.ts`)

Handles data format upgrades to ensure backward compatibility.

**Features:**
- Converts old `mastery` (0-100) system to new `memoryStrength`/`interval` system
- Format version tracking (`_formatVersion` field)
- Idempotent migration (already-migrated data not re-migrated)
- Automatic migration on data load (Storage & Google Drive)

**Conversion Formula:**
- `memoryStrength = (mastery / 100) * maxMemoryStrength`
- mastery 0 → memoryStrength 0 (beginner)
- mastery 100 → memoryStrength 1270 (≈1 year interval, mastered)

---

## State Management

### QuizContext (`context/QuizContext.tsx`)

Main application state using React Context + useReducer pattern.

#### State Shape (`QuizState`)
```typescript
{
  progress: UserProgress | null,
  settings: UserSettings | null,
  currentVocab: Vocabulary | null,
  userAnswer: string,
  feedback: { show, correct, type, message, matchedAnswer } | null,
  isLoadingVocab: boolean,
  fatalError: string | null
}
```

#### Actions
- `SETUP_COMPLETE`: Initialize progress after setup
- `LOAD_VOCAB_START/SUCCESS/ERROR`: Vocabulary loading states
- `SET_ANSWER`: Update user input
- `SUBMIT_ANSWER`: Process answer submission
- `ADVANCE_QUEUE`: Move to next vocab item
- `SAVE_SETTINGS`: Update user settings
- `UPDATE_KANJI_KNOWLEDGE`: Update known kanji
- `OVERRIDE_DAILY_LIMIT`: Bypass daily new vocab limit
- `VOCAB_INTRO_CHOICE`: Handle Learn/Skip on intro card
- `RESET`: Clear all progress
- `RESET_DAILY_STATS`: Reset daily counters (midnight)

#### Computed Values
- `isSetupComplete`: Whether initial setup is done
- `sessionState`: Current session state (review/learn/waiting/exhausted)
- `currentProgress`: VocabProgress for current vocab
- `nextReviewAt`: Next review timestamp

#### Key Functions
- `setupComplete({ kanjiKnowledge, settings })`: Complete initial setup
- `submitAnswer()`: Evaluate and record answer
- `advanceQueue({ now, overrideDailyLimit })`: Load next vocab
- `continueToNext()`: Move to next item after feedback
- `saveVocabIntroChoice(vocab, 'learn'|'skip')`: Handle intro card choice

---

## Application Pages

### Quiz Screen (`pages/quiz/QuizScreen.tsx`)

Main study interface. Displays different components based on `sessionState`:

- **`sessionState === 'review'`**: Show `QuizCard` (active review)
- **`sessionState === 'learn'`**: Show `VocabIntroCard` (new vocab introduction)
- **`sessionState === 'waiting'`**: Show `WaitingScreen` (next review time)
- **`sessionState === 'exhausted'`**: Show `ExhaustedScreen` (no more content)

**Auto-advance logic**: If queue has no valid items but can introduce new vocab, automatically calls `advanceQueue()`.

### Onboarding Flow (`pages/setup/OnboardingFlow.tsx`)

Wrapper for new users replacing the direct `SetupScreen` call. Manages a two-step process:
1. **Welcome Screen**: Explains methodology and offers three paths:
   - *Beginner*: Bypasses setup, initializes with KKLC step 0 and `kklc` learning order.
   - *Kanji Learner*: Proceeds to `SetupScreen`.
   - *Restore Progress*: Google Drive login to pull existing data.
2. **Setup Screen**: The original wizard for "Kanji Learner" paths. Collects kanji knowledge method/step and learning order preferences.

Calls `actions.setupComplete()` when the flow produces a valid `SetupValues` object.

### Settings Screen (`pages/settings/Settings.tsx`)

- Change learning order (frequency/KKLC)
- Reset progress (with confirmation)

### Profile Screen (`pages/profile/UserProfileScreen.tsx`)

- View/edit kanji knowledge
- Update known kanji set

---

## Build & Development

### Commands (from `package.json`)

**Development:**
```bash
bun run dev          # Start dev server (Vite)
bun run typecheck    # TypeScript type checking
bun run lint         # ESLint
```

**Build:**
```bash
bun run build        # Production build
bun run preview      # Preview production build
```

**Testing:**
```bash
bun test             # Run all tests (Vitest)
bun test:watch       # Run tests in watch mode
```

**Data Compilation:**
```bash
bun run build:data   # Compile all data (kanji + vocab)
bun run build:kanji  # Compile KKLC kanji only
bun run build:vocab  # Compile vocabulary only
bun run build:jpdb   # Convert JPDB TSV to JSON
```

### Data Build Scripts

**`scripts/build-kanji.ts`**
- Reads KKLC dataset
- Generates `data/compiled/index/kklc-kanji.json`

**`scripts/build-vocabulary.ts`**
- Reads JMDict data
- Reads JPDB frequency data
- Generates:
  - `data/compiled/vocab/{id}.json` (individual vocab files)
  - `data/compiled/index/kklc.json` (KKLC-ordered index)
  - `data/compiled/index/frequency.json` (frequency-ordered index)

**`scripts/build-sentences.ts`**
- Reads Japanese-English sentence pairs (TSV)
- Reads reading indices (CSV)
- Performs greedy tokenization to associate sentences with vocabulary
- Generates `data/compiled/sentences/{vocabId}.json`


**`scripts/build-sentences.ts`**
- Reads Japanese-English sentence pairs (TSV)
- Reads reading indices (CSV)
- Performs greedy tokenization to associate sentences with vocabulary
- Generates `data/compiled/sentences/{vocabId}.json`


**Data Sources:**
- KKLC: https://github.com/ppasupat/vocab-kanji
- JMDict: Japanese-English dictionary
- JPDB: https://jpdb.io frequency data

### Test Infrastructure

**Test Framework**: Vitest

**Test Files:**
- `src/services/srs.service.test.ts` - SRS algorithm unit tests
  - Formula verification tests (8 test cases covering different scenarios)
  - Minor error classification tests (Levenshtein distance validation)
  - Alternative reading matching tests
  - Retry flag behavior tests
- `src/services/migration.service.test.ts` - Data migration tests
  - Old format (mastery) to new format (memoryStrength/interval) conversion
  - Edge cases (mastery 0, mastery 100)
  - Idempotency (already-migrated data not re-migrated)
  - Real production data samples
- `scripts/build-vocabulary.test.ts` - Data integrity tests
  - Validates all vocab IDs in KKLC index have corresponding files
  - Validates all vocab IDs in frequency index have corresponding files
  - Validates all vocab files contain valid JSON

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
   - When user gives wrong answer: `needsRetry = true` is set. Item review schedule is updated based on the failure.
   - Item appears in current session (mixed with old reviews)
   - On retry attempt:
     - If Correct: `needsRetry = false`. **SRS state is NOT updated** (training only). Original failure scheduling stands.
     - If Wrong: `needsRetry = true` (loop until correct). SRS state is NOT updated (prevent double penalty).
   - This ensures retries help user learn correct answer without artificially inflating memory strength after a failure.

6. **Queue Refill**:
   - Triggered automatically in `QuizContext` when `nextDue` is null and session state is 'learn'
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

Implemented in `QuizContext` via `computeSessionView()`:

```typescript
if (hasDueReviews) return 'review'
if (canIntroduceNew && hasLearnableVocab) return 'learn'
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
     - If `geminiApiKey` is configured and a sentence is available:
       - If `alwaysUseAiForMeaningContext` is `true` (default), AI validates ALL answers (including strict-correct ones)
       - If `alwaysUseAiForMeaningContext` is `false`, AI only validates answers that were strict-wrong or strict-minor_error
       - On AI network error (400, 500, etc.): silently falls back to the strict evaluation result
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
