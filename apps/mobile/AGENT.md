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

### Data Fetch — expo-file-system (`src/services/fetch.adapter.native.ts`)

Reads bundled JSON assets instead of making HTTP requests:

```typescript
// Android: file:///android_asset/data/compiled/<path>
// iOS:     <bundleDirectory>/data/compiled/<path>
```

The vocabulary dataset must be bundled in the app binary:
- Android: files in `assets/data/compiled/` are packaged in the APK via `scripts/copy-assets.js`
- iOS: same directory is included in the app bundle

---

## Root Layout (`app/_layout.tsx`)

Performs all initialization before rendering screens:

1. **Font loading** via `expo-font`:
   - `SourceSerif4_400Regular`, `SourceSerif4_700Bold`
   - `NotoSerifJP_400Regular`, `NotoSerifJP_700Bold`
   - `SawarabiGothic_400Regular`
   - `NotoSansJP_400Regular`, `NotoSansJP_700Bold`

2. **Adapter configuration**:
   ```typescript
   VocabularyService.configure(createNativeFetchAdapter());
   // StorageService is configured by mmkvAdapter in GoogleDriveProvider
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
