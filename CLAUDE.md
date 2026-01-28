# CLAUDE Project Context

> [!IMPORTANT]
> **Keep this documentation updated.**
> This file serves as the long-term memory for AI agents working on Gokan SRS. When making functional changes, update the relevant sections to reflect the current state of the codebase.
>
> **CRITICAL: Maintain both CLAUDE.md and GEMINI.md in sync.**
> When updating this file, you MUST also update GEMINI.md with identical changes to ensure both AI agents (Claude and Gemini) have equivalent knowledge. Both files should always contain the same information.

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
├── CLAUDE.md                 # This file
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
- `preferredLearningOrder`: `'frequency'` | `'kklc'`

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

### Setup Screen (`pages/setup/SetupScreen.tsx`)

Initial onboarding wizard. Collects:
1. Kanji knowledge (method + step/count)
2. Learning preferences (order)

Calls `actions.setupComplete()` when done.

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
npm run dev          # Start dev server (Vite)
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

**Build:**
```bash
npm run build        # Production build
npm run preview      # Preview production build
```

**Data Compilation:**
```bash
npm run build:data   # Compile all data (kanji + vocab)
npm run build:kanji  # Compile KKLC kanji only
npm run build:vocab  # Compile vocabulary only
npm run build:jpdb   # Convert JPDB TSV to JSON
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

**Data Sources:**
- KKLC: https://github.com/ppasupat/vocab-kanji
- JMDict: Japanese-English dictionary
- JPDB: https://jpdb.io frequency data

---

## Functional Workflows

### Learning Queue Logic

The SRS study session follows a strict priority system:

1. **Reviews First**:
   - While the queue contains items with `nextReviewAt <= now`, these are presented to the user
   - Order: Random selection from the pool of due items (to prevent interference effects)

2. **New Vocabulary Introduction**:
   - If (and only if) no reviews are due (`nextReviewAt` is future or empty), the system checks for **New Items**
   - **New Items** are defined as items in the queue with `nextReviewAt: null` AND `stage !== 'graduated'`
   - The queue is refilled from the main Index based on daily limits
   - **User Action**:
     - **Learn**: Item activates with base memory strength. `nextReviewAt` set to `now` (becomes immediately reviewable)
     - **Skip**: Item is marked as **Fully Mastered** (`maxMemoryStrength`). Stage set to `graduated`. It will not appear in reviews
     - **Mastery**: If `memoryStrength >= maxMemoryStrength` after a review, item graduates. `nextReviewAt` is cleared

3. **Completion**:
   - Session ends when: No Due Reviews AND (Daily Limit Reached OR No More Learnable Content)

### Session State Computation

Implemented in `QuizContext` via `computeSessionView()`:

```typescript
if (hasDueReviews) return 'review'
if (canIntroduceNew && hasLearnableVocab) return 'learn'
if (hasUpcomingReviews) return 'waiting'
return 'exhausted'
```

### Answer Evaluation Flow

1. User types answer in hiragana
2. `submitAnswer()` called
3. `SRSService.evaluateAnswer()` checks against all readings
4. `SRSService.applyAnswer()` updates memory strength
5. Feedback shown (correct/incorrect + matched answer)
6. `continueToNext()` loads next vocab

### Daily Reset Logic

- `stats.newLearnedToday` resets at midnight
- Implemented via `RESET_DAILY_STATS` action
- Triggered by date change detection

---

## Constants & Configuration

### Key Constants (`commons/constants.ts`)

**SRS Limits:**
- `dailyNewLimit`: 20 new vocab per day
- `newVocabBatchSize`: 1 (introduce one at a time)
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

- **[2026-01-28]**: Created comprehensive project documentation covering architecture, data models, services, state management, and workflows.
- **[2026-01-26]**: Documented SRS priority workflow and error handling policy.
- **[2026-01-22]**: Acknowledged new Design System. Refactoring visual feedback to match "Sober & Serious" tone.
