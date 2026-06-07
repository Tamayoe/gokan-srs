# @gokan-srs/mobile — Agent Context

> [!IMPORTANT]
> This is the **Expo React Native application** (Android + iOS).
> It uses `expo-router` for file-based routing and native platform adapters.
> See the root [`AGENT.md`](../../AGENT.md) for the full project overview.

## App Structure

```
apps/mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout: providers, fonts, navigation context
│   ├── index.tsx                 # / → QuizScreen
│   ├── stats.tsx                 # /stats → StatsScreen
│   ├── profile.tsx               # /profile → UserProfileScreen
│   ├── settings.tsx              # /settings → SettingsScreen
│   ├── about.tsx                 # /about → AboutScreen
│   └── vocab/
│       └── [id].tsx              # /vocab/:id → VocabDetailScreen
├── src/
│   ├── context/
│   │   └── GoogleDriveContext.native.tsx   # Google Drive provider (native Sign-In)
│   └── services/
│       ├── fetch.adapter.native.ts         # FetchAdapter using expo-file-system
│       └── mmkv.adapter.ts                 # StorageAdapter using react-native-mmkv
├── assets/                       # App icons, splash screens
│   └── data/
│       └── compiled/             # Vocabulary dataset (bundled in APK/IPA)
├── scripts/
│   └── copy-assets.js            # Copies compiled data into android assets before build
├── app.json                      # Expo configuration (app name, bundle ID, etc.)
├── index.ts                      # Expo entry point (expo-router/entry)
└── package.json                  # @gokan-srs/mobile
```

---

## Platform Adapters (Native)

### Storage — MMKV (`src/services/mmkv.adapter.ts`)

Uses `react-native-mmkv` for fast synchronous key-value storage (replaces `localStorage`):

```typescript
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();

export const mmkvStorageAdapter: StorageAdapter = {
    getItem: (key) => storage.getString(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
};
```

### Data Fetch — SQLite + expo-file-system (`src/services/`)

Vocabulary data is stored in a local SQLite database (`gokan.db`, managed by `expo-sqlite`). The `FetchAdapter` interface is preserved — only the implementation changes.

**Files:**
- `src/services/sqlite.service.ts` — DB lifecycle, vocab/sentences queries, sentence cache writes
- `src/services/fetch.adapter.native.ts` — `FetchAdapter` implementation that routes through SQLite

**Data flow:**

| Request type | Source |
|---|---|
| `/vocab/{id}.json` | SQLite `vocab` table |
| `/sentences/{id}.json` | SQLite `sentences` table → CDN fetch → `[]` fallback |
| `/index/*.json` | Direct asset file read |

**First-launch migration** — Vocab (~36,457 entries) cannot be stored as individual APK files (Android's 65,535 ZIP-entry limit). Instead, `copy-assets.js` merges them into `vocab-bundle.json` (~22 MB). On first launch, `sqlite.service.ts` reads this bundle and batch-inserts it into SQLite in groups of 200 rows per statement (~2-5 s, one-time). Subsequent launches open the existing DB directly.

**Sentences offline cache** — Sentences (891 MB uncompressed) cannot be bundled in the APK. `fetch.adapter.native.ts` checks the local SQLite `sentences` table first; on a miss it fetches from the CDN (configure `SENTENCES_CDN_BASE_URL` constant in the adapter) and caches the result for future offline use. UI components handle `[]` gracefully when neither cache nor CDN is available.

**APK asset layout** (`android/app/src/main/assets/data/compiled/`):
```
index/              ← 4 files, copied as-is
vocab-bundle.json   ← ~22 MB, source for first-launch SQLite migration
```

**SQLite DB** (`gokan.db`, lives in app data directory, never in APK):
```
vocab     (id TEXT PRIMARY KEY, data TEXT)      ← 36,457 rows
sentences (vocab_id TEXT PRIMARY KEY, data TEXT) ← grows as user studies
```

---

## Root Layout (`app/_layout.tsx`)

Performs all initialization before rendering screens:

1. **Font loading** via `expo-font`:
   - `SourceSerif4_400Regular`, `SourceSerif4_700Bold`
   - `NotoSerifJP_400Regular`, `NotoSerifJP_700Bold`
   - `SawarabiGothic_400Regular`
   - `NotoSansJP_400Regular`, `NotoSansJP_700Bold`

2. **SQLite init** — `getDb()` is called in a `useEffect` immediately at mount. On first launch this migrates vocab from `vocab-bundle.json` into `gokan.db` (~2-5 s). A `Loader` is shown until both fonts and the DB are ready (`!fontsLoaded || !dbReady`).

3. **Adapter configuration**:
   ```typescript
   VocabularyService.configure(createNativeFetchAdapter());
   StorageService.configure(mmkvStorageAdapter);
   ```

3. **Google Sign-In configuration**:
   ```typescript
   GoogleSignin.configure({
       webClientId: '…',
       scopes: ['https://www.googleapis.com/auth/drive.appdata'],
   });
   ```

4. **Provider tree**:
   `NavigationContext` → `ThemeProvider` → `GoogleDriveProvider` → `ResponsiveProvider` → `QuizProvider` → `<Stack>`

5. **NavigationContext** is provided here, bridging `expo-router`'s `useRouter` + `useSegments` into the platform-agnostic navigation abstraction.

---

## Routing (Expo Router)

Expo Router uses **file-based routing** — the `app/` directory mirrors URL structure.

| File | Path | Shared Component |
|---|---|---|
| `app/index.tsx` | `/` | `QuizScreen` from `@gokan-srs/app` |
| `app/stats.tsx` | `/stats` | `StatsScreen` |
| `app/profile.tsx` | `/profile` | `UserProfileScreen` |
| `app/settings.tsx` | `/settings` | `SettingsScreen` |
| `app/about.tsx` | `/about` | `AboutScreen` |
| `app/vocab/[id].tsx` | `/vocab/:id` | `VocabDetailScreen` |

Each route file is a thin wrapper that renders the shared page component from `@gokan-srs/app`, passing any necessary props.

**Navigation calls** inside shared components use `useAppNavigation()` from `NavigationContext`. In `_layout.tsx`, `navigate(path)` calls `router.push(path)` and `getParam('vocabId')` reads from `useSegments()`.

---

## Google Drive (Native) — `GoogleDriveContext.native.tsx`

Uses `@react-native-google-signin/google-signin`:
- **Silent sign-in on startup**: `GoogleSignin.isSignedIn()` → `signInSilently()` → restore session
- **Manual sign-in**: `GoogleSignin.hasPlayServices()` → `signIn()` → `getTokens()` → create `GoogleDriveSync`
- **Upload debounce**: 2000ms after last change before uploading
- **Min loading time**: 1000ms shown on initial download (UX)
- **Auth error handling**: on `GoogleAuthError`, triggers re-authentication flow

The `GoogleUser` shape (from `@gokan-srs/app/context/GoogleDriveContext`):
```typescript
{ access_token, name?, email, picture? }
```

---

## Build Commands

```bash
# Development (from apps/mobile or root)
bun run start          # Expo dev server (Metro bundler)
bun run android        # expo run:android — build + run on device/emulator
bun run ios            # expo run:ios — build + run on iOS simulator

# Production Android APK
bun run build:android
# Equivalent to:
expo prebuild -p android
node scripts/copy-assets.js    # Copies data/compiled → android/app/src/main/assets/data/compiled
cd android && gradlew.bat assembleRelease
```

> [!NOTE]
> `scripts/copy-assets.js` is a critical step. Without it, the Android build will not include the
> vocabulary dataset and the app will fail to load any vocabulary.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `expo ~55` | Core Expo SDK |
| `expo-router ~55` | File-based routing |
| `expo-file-system` | Read bundled JSON assets |
| `expo-font` | Load custom fonts |
| `react-native-mmkv` | Fast synchronous storage |
| `@react-native-google-signin/google-signin` | Google OAuth for native |
| `@expo-google-fonts/*` | Font packages (Source Serif 4, Noto Serif JP, Noto Sans JP, Sawarabi Gothic) |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-screens` | Native screen containers |
