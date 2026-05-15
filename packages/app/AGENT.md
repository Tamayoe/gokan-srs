# @gokan-srs/app — Agent Context

> [!IMPORTANT]
> This package contains all **shared React Native UI** — components, pages, and React contexts.
> It targets React Native primitives (`View`, `Text`, `Pressable`, …) so it renders on both
> web (via `react-native-web`) and mobile (native RN) without modification.
> See the root [`AGENT.md`](../../AGENT.md) for the full project overview.

## Package Structure

```
packages/app/src/
├── commons/                      # App-level constants (if any beyond @gokan-srs/core)
├── components/                   # Reusable UI components (React Native)
│   ├── CenteredCard.tsx
│   ├── ExhaustedScreen.tsx
│   ├── InteractiveSentence.tsx   # Clickable Japanese sentence with vocab highlighting
│   ├── KanjiCountInput.tsx
│   ├── KanjiField.tsx
│   ├── KanjiKnowledgeEditor.tsx
│   ├── LearnKanjiCard.tsx
│   ├── Loader.tsx
│   ├── LoadingScreen.tsx
│   ├── Logo.tsx
│   ├── MasteryRing.tsx           # Circular mastery progress indicator
│   ├── OptionGrid.tsx
│   ├── ProgressBar.tsx
│   ├── ReviewTimeline.tsx
│   ├── SessionProgress.tsx
│   ├── SetupHeader.tsx
│   ├── Stat.tsx
│   ├── VocabCard.tsx
│   ├── VocabCardLoader.tsx
│   ├── VocabHistoryGraph.tsx     # SVG interval-over-time learning curve
│   ├── VocabIntroCard.tsx        # New vocab introduction (Learn / Skip)
│   ├── VocabList.tsx
│   ├── WaitingScreen.tsx
│   └── ui/                       # Low-level primitive wrappers
├── context/
│   ├── QuizContext.tsx            # Main app state (useReducer)
│   ├── useQuiz.ts                 # Hook to consume QuizContext
│   ├── GoogleDriveContext.ts      # Context shape + useGoogleDrive hook (platform-agnostic)
│   ├── NavigationContext.tsx      # Platform-agnostic navigation abstraction
│   ├── ThemeContext.tsx           # Light/dark/system theme
│   ├── KanjiForm/                 # Multi-step kanji knowledge form state
│   └── Responsive/                # Responsive breakpoint utilities
├── pages/
│   ├── quiz/                      # QuizScreen — main study interface
│   ├── setup/                     # OnboardingFlow + SetupScreen
│   ├── settings/                  # SettingsScreen
│   ├── profile/                   # UserProfileScreen
│   ├── stats/                     # StatsScreen
│   ├── about/                     # AboutScreen
│   └── vocab/                     # VocabDetailScreen
├── models/                        # App-level types (supplements @gokan-srs/core models)
└── utils/                         # App-level helpers
```

---

## State Management — `QuizContext`

Main application state via `React Context + useReducer`. **All quiz logic flows through here.**

### State Shape (`QuizState`)
```typescript
{
  progress: UserProgress | null,
  settings: UserSettings | null,
  currentVocab: Vocabulary | null,
  currentSentence: SentenceSet | null,
  currentQuizItem: QuizItem | null,
  sessionQueue: QuizItem[],       // Frozen queue for current session
  userAnswer: string,
  feedback: { show, correct, type, message, matchedAnswer, aiNote? } | null,
  isLoadingVocab: boolean,
  fatalError: string | null
}
```

### Actions
| Action | Effect |
|---|---|
| `SETUP_COMPLETE` | Initialize progress + settings after onboarding |
| `LOAD_VOCAB_START/SUCCESS/ERROR` | Vocabulary loading lifecycle |
| `BUILD_SESSION_QUEUE` | Snapshot the current due items into a frozen queue |
| `SHIFT_SESSION_QUEUE` | Advance to next item; pop from queue head |
| `SET_ANSWER` | Update user text input |
| `SUBMIT_ANSWER` | Evaluate answer, compute feedback |
| `ADVANCE_QUEUE` | Load next vocab (triggers BUILD_SESSION_QUEUE if needed) |
| `SAVE_SETTINGS` | Persist updated settings |
| `UPDATE_KANJI_KNOWLEDGE` | Update known kanji set |
| `OVERRIDE_DAILY_LIMIT` | Bypass `dailyNewLimit` |
| `VOCAB_INTRO_CHOICE` | Handle Learn/Skip on intro card |
| `RESET` | Clear all progress |
| `RESET_DAILY_STATS` | Reset daily counters at midnight |

### Computed Values (via `useQuiz` hook)
- `isSetupComplete`: whether initial setup is done
- `sessionState`: `'review'` | `'learn'` | `'waiting'` | `'exhausted'`
- `currentProgress`: `VocabProgress` for current vocab
- `nextReviewAt`: next scheduled review timestamp

### Key Actions API
```typescript
actions.setupComplete({ kanjiKnowledge, settings })
actions.submitAnswer()
actions.advanceQueue({ now, overrideDailyLimit? })
actions.continueToNext()
actions.saveVocabIntroChoice(vocab, 'learn' | 'skip')
actions.saveSettings(settings)
actions.reset()
```

### Session Queue Model
The session queue is **frozen at the start of each review session**. Items becoming due mid-session wait until the queue drains. Wrong answers are `APPEND`ed at a random position in the remaining queue.

---

## Navigation — `NavigationContext`

Abstracts routing so shared pages/components don't depend on `react-router-dom` or `expo-router`.

```typescript
interface NavigationContextValue {
    navigate: (path: string) => void;
    goBack: () => void;
    getParam: (key: string) => string | undefined;
}
```

**Web**: provided by `apps/web/src/App.tsx` using `react-router-dom`'s `useNavigate` / `useLocation`.
**Mobile**: provided by `apps/mobile/app/_layout.tsx` using `expo-router`'s `useRouter` / `useSegments`.

Pages call `useAppNavigation()` from this context — never import router libraries directly in `packages/app`.

---

## Google Drive Context — `GoogleDriveContext.ts`

This file defines **only the context shape + `useGoogleDrive()` hook**. The provider implementation is platform-specific:

| Platform | Provider location |
|---|---|
| Web | `apps/web/src/context/GoogleDriveContext.web.tsx` (uses `@react-oauth/google`) |
| Mobile | `apps/mobile/src/context/GoogleDriveContext.native.tsx` (uses `@react-native-google-signin/google-signin`) |

```typescript
interface GoogleDriveContextValue {
    login(): Promise<void>;
    logout(triggerReauth?: boolean): Promise<void>;
    downloadProgress(): Promise<void>;
    uploadProgress(envelope: { progress: any; settings: any }): Promise<void>;
    isDownloading: boolean;
    isUploading: boolean;
    isAuthenticated: boolean;
    isInitialLoadComplete: boolean;
    user: GoogleUser | null;
    lastDownloadTime: number | null;
}
```

`isInitialLoadComplete` gates the app: the root layout shows a loading screen until the initial sync attempt finishes (whether or not the user is signed in).

---

## Application Pages

### Quiz Screen (`pages/quiz/QuizScreen.tsx`)
Main study interface. Renders based on `sessionState`:
- `'review'` → `QuizCard` (active review — reading or meaning)
- `'learn'` → `VocabIntroCard` (new vocab introduction with Learn/Skip)
- `'waiting'` → `WaitingScreen` (shows next review time)
- `'exhausted'` → `ExhaustedScreen` (no more content)

**Quiz types:**
- **Reading quiz**: user types hiragana for the vocabulary reading
- **Meaning base quiz**: user types English meaning (strict dict evaluation)
- **Meaning context quiz**: user types English meaning in the context of a sentence (AI-assisted evaluation via Gemini)

### Onboarding Flow (`pages/setup/OnboardingFlow.tsx`)
Two-step new user flow:
1. **Welcome screen** — three paths: Beginner (skip setup, KKLC step 0), Kanji Learner (→ SetupScreen), Restore Progress (Google Drive login)
2. **Setup screen** — collects kanji method/step and learning order preference

### Other Screens
- `StatsScreen`: daily stats, review forecast, vocab progression chart, kanji coverage
- `UserProfileScreen`: view/edit kanji knowledge, update known kanji set
- `SettingsScreen`: learning order, frequency, meaning quiz toggle, AI key, reset
- `VocabDetailScreen`: full vocab detail — readings, meanings, sentences, component/parent relationships, `VocabHistoryGraph`
- `AboutScreen`: app info

---

## Learning Queue Logic

**Priority order** (implemented in `srs.utils.ts` `getNextVocabToStudy`):

1. **Priority 1 — Old Reviews + Retry Items**: `totalReviews > 0` AND `nextReviewAt <= now`, OR `needsRetry === true`. Mixed randomly.
2. **Priority 2 — New Intros**: `introductionAt === null` AND `stage !== 'graduated'`. Introduced 3 at a time (`newVocabBatchSize`).
3. **Priority 3 — First Reviews**: `totalReviews === 0`, `introductionAt !== null`, `nextReviewAt <= now`. Lower priority than new intros to allow buffering.

**Retry mechanism**: wrong answers set `needsRetry = true`. On retry correct → flag cleared, SRS NOT updated. On retry wrong → stays in queue. Prevents double-penalty.

**Session ends when**: no due reviews AND (daily limit reached OR no more learnable content).

---

## Answer Evaluation Flow

1. User submits answer
2. `SUBMIT_ANSWER` action in `QuizContext`
3. Determine `quizType` + `quizMode` from `currentQuizItem`
4. Evaluate:
   - Reading → `SRSService.evaluateAnswer()`
   - Meaning base → `SRSService.evaluateMeaning()`
   - Meaning context → `evaluateMeaning()` first; then Gemini validation if configured
     - `alwaysUseAiForMeaningContext = true`: AI validates ALL answers
     - `alwaysUseAiForMeaningContext = false`: AI only validates wrong/minor_error
     - Network error → fall back to strict result silently
5. Show feedback
6. `continueToNext()` → calls `SRSService.applyAnswer()` → updates progress → triggers next item
