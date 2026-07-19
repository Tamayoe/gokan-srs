# Infinite auto-upload loop — investigation summary

> [!NOTE]
> **RESOLVED [2026-07-19].** The root cause was NOT the missing-key/partial-settings
> hypothesis below (settings normalization against `DEFAULT_SETTINGS` already existed
> in `loadSettings`/`parseEnvelope`). The actual defect: `migration.service.ts`'s
> unconditional `nextReviewAt` recompute called `vocabNextReviewAt(item)` with **no
> settings argument at all** — and `isMeaningQuizEnabled(undefined)` returns `true`.
> So every hydration (localStorage load AND Drive download both go through
> `migrateAndHydrateProgress`) stamped the meaning-based due date, while every merge
> (`mergeVocabProgress`, settings-aware) stamped the reading-based date — a guaranteed
> content flip per load→merge round trip, which is exactly the oscillation observed.
> Two secondary defects kept the loop alive even with identical content: the reconcile
> effect's version guard never held (the version bumps on every merge), and the
> auto-upload effect depended on unstable references (`uploadProgress` recreated per
> provider render, `state.settings` remade per reconcile). All three fixed — see the
> [2026-07-19] entry in CLAUDE.md/GEMINI.md for details. The "give settings their own
> version" idea (Bug 1) is real but was not causal; it remains an optional cleanup.

## Symptom

`useQuizOrchestration.ts`'s auto-upload effect fires continuously:

```ts
useEffect(() => {
    if (state.progress && state.settings && !isDownloading) {
        uploadProgress({ progress: state.progress, settings: state.settings }).catch(...);
    }
}, [state.progress, state.settings]);
```

Each upload triggers a background merge, which mutates `state.progress` again, which
re-triggers the effect. Confirmed via logging: this is a **real content oscillation**,
not just a bad dependency array — one specific field (`nextReviewAt` on vocab
`1338180`, and likely others) flips between two different valid values on every
cycle, seconds apart:

- Value A: `2026-07-24T16:31:19.564Z` (== `reading.dueDate`)
- Value B: `2026-07-19T08:00:12.814Z` (== `meaning.dueDate`)

`reading.dueDate` and `meaning.dueDate` themselves are byte-identical across both
snapshots — nothing about the actual SRS review data changed. Only the *derived*
`nextReviewAt` flips. `totalReviews`, `history`, etc. are unchanged too.

## Fixes already applied (working, keep these)

### 1. Stale-closure fix for `uploadProgress` in the dependency array
`uploadProgress` (from `useGoogleDrive()` context) was not referentially stable,
so adding it to the effect's deps caused a separate infinite loop. Fixed by
calling it through a ref instead of depending on it directly:

```ts
const uploadProgressRef = useRef(uploadProgress);
useEffect(() => { uploadProgressRef.current = uploadProgress; }); // no deps

useEffect(() => {
    if (!progressSignature || !state.progress || !state.settings || isDownloading) return;
    uploadProgressRef.current({ progress: state.progress, settings: state.settings }).catch(err => {
        console.error('[useQuizOrchestration] Auto-upload failed', err);
    });
}, [progressSignature, state.settings, isDownloading]);
```

Root cause of *that* instability (is `uploadProgress` wrapped in `useCallback`
correctly in `GoogleDriveContext`?) was **not** investigated — worth a quick check
independent of everything below, since any other consumer of that context could
hit the same class of bug.

### 2. Signature-based dependency instead of raw object reference
Added `progressUploadSignature()` in `progressSerialization.ts` — strips `_sync`
and normalizes `kanjiKnowledge.kanjiSet` (a `Set`, which `JSON.stringify` would
otherwise silently serialize as `{}`) before JSON-stringifying, memoized via
`useMemo`, and used as the effect dependency instead of `state.progress` directly.
This is correct and should stay — it's what *exposed* the real bug below instead of
masking it.

**This fix alone does not stop the loop**, because the underlying data really is
changing on every cycle (see below) — the signature correctly detects a real diff
each time.

## Root cause — CONFIRMED

### The `nextReviewAt` math, worked out precisely

`vocabNextReviewAt(vocab, settings)`:
```ts
const meaningRelevant = isMeaningQuizEnabled(settings);
const meaningMastered = !meaningRelevant || isEntryMastered(vocab.meaning);
const rDue = readingMastered ? null : vocab.reading.dueDate;   // 2026-07-24
const mDue = meaningMastered ? null : vocab.meaning.dueDate;   // 2026-07-19 (only if meaningRelevant)
if (rDue && mDue) return rDue < mDue ? rDue : mDue;            // returns mDue (earlier) if both present
return rDue ?? mDue;
```

- Snapshot A (`07-24`, reading's date) requires `mDue == null` → `meaningRelevant == false`.
- Snapshot B (`07-19`, meaning's date) requires `mDue != null` → `meaningRelevant == true`.

Since `reading.dueDate` and `meaning.dueDate` never change between snapshots, **the
flip is 100% caused by `isMeaningQuizEnabled(settings)` (i.e. effectively
`settings.enableMeaningQuiz`) evaluating differently across two different calls to
`vocabNextReviewAt`**, despite the app's actual settings value being constantly
`enableMeaningQuiz: false` (confirmed repeatedly in React-level logs — the settings
object logged at the top of `useQuizOrchestration` is always exactly:

```json
{
    "alwaysUseAiForMeaningContext": true,
    "enableGeminiContext": true,
    "enableMeaningQuiz": false,
    "geminiApiKey": "AIzaSyBHQCCtfZ5JcpFc9mIIHml9QjUGDyXgVAo",
    "kanjiCoverageTarget": 1,
    "learningFrequency": "medium",
    "meaningContextThreshold": "normal",
    "preferredLearningOrder": "frequency"
}
```
— i.e. the *value never varies*, so this is not a stale-vs-fresh value problem,
it's a **shape/presence problem** — see hypothesis below).

### Ruled out

- **`applyAnswer`**: not the cause — no answer was submitted between the two
  snapshots (confirmed by user).
- **`progressSerialization.ts` (`hydrateProgress`)**: does NOT recompute
  `nextReviewAt` — it only does `hydrateDate(elem.nextReviewAt)`, i.e. carries the
  stored value through as-is. Ruled out as the site of the flip.
- **`mergeEntry`** (merges one `SRSEntry` — reading or meaning — field by field):
  deterministic given the same two inputs (recency-based winner-take-all for
  scheduling fields, max() for memoryStrength/interval, deduped history union).
  Confirmed clean, not the cause.
- **`mergeSettings`** itself (`remoteVersion > localVersion ? remote : local`):
  logically simple and deterministic given its inputs — but see the "version
  conflation" issue below, which is a real bug in how it's *called*, even though
  the function body itself is fine.

### Two real structural bugs identified, one of which is confirmed to be involved, other's role is unconfirmed

**Bug 1 (confirmed real, severity uncertain): version conflation in `mergeSettings` calls.**

`UserSettings` has no version/timestamp of its own. Both call sites that invoke
`mergeSettings` borrow the **progress** sync version to decide which settings
object is "newer":

```ts
// syncService.sync() / initialize()
const mergedSettings = mergeSettings(effectiveLocalEnvelope.settings, remoteSettings, localVersion, remoteVersion);
// where localVersion/remoteVersion come from progress._sync.version

// useQuizOrchestration reconcile effect
const reconciledSettings = mergeSettings(state.settings, settingsFromDisk, liveVersion, diskVersion);
// same — liveVersion/diskVersion are progress._sync.version, not settings-specific
```

`mergeProgress` unconditionally bumps `_sync.version` by `+1` on **every** merge,
even when nothing meaningful changed:
```ts
_sync: { lastModified: Date.now(), version: Math.max(localVersion, remoteVersion) + 1 }
```
So the version counter increments on routine sync cycles unrelated to any settings
edit. This means a settings blob that is actually stale/wrong can still "win" a
merge simply because the *progress* version attached to it happens to be higher —
version and settings-recency are not actually correlated the way the code assumes.

**This is a real bug and should be fixed** (give settings their own
`_sync`/version, independent of progress's), but by itself it doesn't explain the
oscillation, because the user confirmed **the settings value is always identical**
in every stored/local copy (`enableMeaningQuiz: false` everywhere, no old blob with
`true` is known to exist). So even if a "wrong side" wins the version race, the
value should still be `false` — unless the "wrong side" isn't just an older
value but a **differently-shaped object** (see Bug 2).

**Bug 2 (leading hypothesis, NOT YET CONFIRMED): missing-key defaulting in
`isMeaningQuizEnabled` / lack of settings normalization on load.**

Given the value is always `false` everywhere it's logged, the more likely
explanation is that at least one settings object reaching `vocabNextReviewAt`
during some merge is **missing the `enableMeaningQuiz` key entirely** (not present
= `undefined`), rather than carrying the value `true`. If `isMeaningQuizEnabled`
has a fallback like `settings?.enableMeaningQuiz ?? true` (default **on** when
absent — a very plausible way to write that helper), an incomplete/partial
settings object would silently behave as if meaning quizzes were enabled, even
though no real, complete settings object in the app ever had that value.

Unlike `hydrateProgress`, which carefully spreads over `DEFAULT_PROGRESS` /
`DEFAULT_VOCABULARY_PROGRESS` before use, **no equivalent defaulting step for
settings has been found yet** in any of the reviewed code (`mergeSettings` does a
whole-object swap, not a field merge with defaults; `StorageService.loadSettings`
and the Drive `resolveCanonicalFile`/`serializeEnvelope` path have NOT been
inspected yet for whether they normalize against `DEFAULT_SETTINGS`).

## What still needs to be checked (not yet seen by us)

1. **`isMeaningQuizEnabled`'s implementation** — critical. What does it return
   when `settings` is `undefined`? When `settings.enableMeaningQuiz` is
   `undefined`? This is the single most likely site of the actual defect.
2. **`DEFAULT_SETTINGS`** — what is `enableMeaningQuiz` set to there, and is
   `DEFAULT_SETTINGS` ever spread over a loaded/merged/remote settings object
   anywhere in the sync path (vs. only used in the post-download effect in
   `useQuizOrchestration`, i.e. `StorageService.loadSettings() ?? DEFAULT_SETTINGS`,
   which only applies when the whole value is nullish, not when individual keys are
   missing)?
3. **`StorageService.loadSettings()`** — does it parse raw JSON and return it as-is,
   or does it normalize/backfill missing fields?
4. **`resolveCanonicalFile()` / `serializeEnvelope()` on the Drive side** — could a
   remote file ever be read back as partial/malformed (e.g. an old file written
   before `enableMeaningQuiz` existed as a setting, or a race where Drive returns a
   half-written/older file)? Is there any code path where `resolved.envelope?.settings`
   ends up as `{}` or missing keys?
5. Confirm whether there is a **third, independent merge call site** beyond the two
   already found (`syncService.sync()`'s internal merge-then-upload-then-save, and
   the `useQuizOrchestration` reconcile effect that runs on `lastBackgroundMergeTime`
   change) — the log ordering suggested `mergeLearningQueues` fires essentially
   synchronously with the upload effect's log line, consistent with `sync()`'s
   internal merge, but this hasn't been traced end-to-end with a stack trace or
   more granular logging.

## Known-clean code (reviewed, no changes needed there)

- `vocabNextReviewAt` — logic is correct and deterministic *given* correct inputs;
  it is explicitly documented as the single source of truth and should stay that
  way. The bug is in what gets passed to it, not its own logic.
- `applyAnswer` — correct, uses `vocabNextReviewAt` properly, not implicated.
- `mergeVocabProgress` / `mergeLearningQueues` / `mergeProgress` — structurally
  sound (field-by-field merge, re-derive stage/nextReviewAt rather than merging
  them directly, union of queues) — EXCEPT for the version-conflation issue in
  Bug 1 above (how `mergeSettings` is invoked, not `mergeProgress`/`mergeEntry`
  themselves).
- `mergeEntry` — deterministic, confirmed clean.
- `hydrateProgress` / `toPlainProgressJSON` in `progressSerialization.ts` — does
  not recompute or touch `nextReviewAt` beyond date (de)serialization; ruled out.
- `progressUploadSignature` — correct as a change-detector; the fact that it
  detects a real diff every cycle is expected and desired behavior, not a flaw in
  the signature function itself.

## Two structural fixes to make once the above is confirmed

1. **Give `UserSettings` its own sync metadata**, independent of progress's
   version counter (e.g. `SettingsWithMetadata { ...UserSettings, _sync: { version, lastModified } }`),
   bumped only when settings actually change (`SAVE_SETTINGS`), never as a
   side-effect of a progress merge. Update `mergeSettings`'s signature to stop
   accepting externally-supplied `localVersion`/`remoteVersion` (currently borrowed
   from progress) and instead read version off the settings objects themselves.
   Update both call sites (`syncService.sync()`/`initialize()`, and the
   `useQuizOrchestration` reconcile effect).

2. **Normalize settings against `DEFAULT_SETTINGS` at every read/merge boundary**,
   the same discipline already applied to progress via `hydrateProgress`
   (`{ ...DEFAULT_PROGRESS, ...migrated }`). Concretely: any place a settings
   object is loaded from localStorage, read from a Drive file, or produced by a
   merge, should go through a single normalizing function
   (`{ ...DEFAULT_SETTINGS, ...raw }`) before being used or passed to
   `vocabNextReviewAt`/`isMeaningQuizEnabled`. This guarantees `enableMeaningQuiz`
   (and any future setting) is always a real, explicit boolean, regardless of how
   old or partial the underlying stored blob is, and regardless of which side wins
   a version-based merge.

Also worth doing regardless of the above (secondary, lower priority):
- Investigate why `uploadProgress` from `useGoogleDrive()` wasn't referentially
  stable (should ideally be fixed at the source with correct `useCallback` deps,
  rather than only worked around via ref in the consumer).
- Consider whether `syncService.sync()` should stop merging-and-saving-locally
  internally and instead return the merged envelope to the caller, so there is
  exactly one merge authority/computation per cycle instead of two independent
  merge call sites that could in principle disagree about inputs.
