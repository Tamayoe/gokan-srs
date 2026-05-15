# @gokan-srs/web — Agent Context

> [!IMPORTANT]
> This is the **Vite + React web application**.
> It uses `react-native-web` to render shared RN components from `@gokan-srs/app` in the browser.
> See the root [`AGENT.md`](../../AGENT.md) for the full project overview.

## App Structure

```
apps/web/
├── src/
│   ├── App.tsx               # Root component: routing, nav context, header, error gate
│   ├── main.tsx              # Entry point: configure adapters, render providers
│   ├── index.css             # Tailwind CSS v4 global styles + font imports
│   ├── App.css               # Additional app-level CSS
│   ├── assets/               # Static images/fonts
│   └── context/              # Web-specific context providers
│       └── GoogleDriveContext.web.tsx  # Google Drive provider using @react-oauth/google
├── public/
│   └── data/
│       └── compiled/         # Vocabulary dataset (served as static files by Vite/CDN)
│           ├── index/        # kklc.json, frequency.json, kklc-kanji.json, search.json
│           ├── vocab/        # {id}.json
│           └── sentences/    # {vocabId}.json
├── vite.config.ts            # Vite configuration (see below)
├── index.html                # HTML shell
└── package.json              # @gokan-srs/web
```

---

## Entry Point (`main.tsx`)

The entry point **configures platform adapters** before rendering:

```typescript
import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { StorageService } from '@gokan-srs/core/services/storage.service';
import { localStorageAdapter } from '@gokan-srs/core/adapters/storage.adapter';
import { createWebFetchAdapter } from '@gokan-srs/core/adapters/fetch.adapter';

StorageService.configure(localStorageAdapter);
VocabularyService.configure(createWebFetchAdapter('/data/compiled'));
```

Then mounts the React app with providers:
`<GoogleOAuthProvider>` → `<BrowserRouter>` → `<ThemeProvider>` → `<GoogleDriveProvider>` → `<QuizProvider>` → `<App />`

---

## Root Component (`src/App.tsx`)

Handles the top-level gates and layout:

1. **Sync gate**: shows `<Loader>` until `isInitialLoadComplete && !isDownloading`
2. **Fatal error gate**: full-screen error if `state.fatalError` is set
3. **Setup gate**: shows `<OnboardingFlow>` if `!isSetupComplete`
4. **Main layout**: top bar (Logo + nav icons) + `<Routes>` + optional footer

**Routes:**

| Path | Component |
|---|---|
| `/` | `QuizScreen` |
| `/stats` | `StatsScreen` |
| `/profile` | `UserProfileScreen` |
| `/settings` | `SettingsScreen` |
| `/about` | `AboutScreen` |
| `/vocab/:vocabId` | `VocabDetailScreen` |
| `*` | Redirect to `/` |

All pages are **lazy-loaded** via `React.lazy()` + `<Suspense>`.

**NavigationContext** is provided here, bridging `react-router-dom`'s `useNavigate`/`useLocation` into the platform-agnostic context.

---

## Vite Configuration (`vite.config.ts`)

Two critical custom plugins:

### `workspace-resolver` (pre-enforced)
Resolves `@gokan-srs/*` workspace package imports directly to their TypeScript source, bypassing `node_modules` symlink resolution issues on Windows/Bun:

```
@gokan-srs/core        → packages/core/src/index.ts
@gokan-srs/core/<sub>  → packages/core/src/<sub>
@gokan-srs/app         → packages/app/src/index.ts
@gokan-srs/ui          → packages/ui/src/index.ts
```

### `react-native-web-fixes` (pre-enforced)
Redirects React Native imports to their web equivalents:

```
react-native           → react-native-web
react-native/<module>  → react-native-web/<module>
codegenNativeComponent → src/utils/codegenNativeComponent.ts (stub)
```

### Other config notes
- `optimizeDeps.include`: pre-bundles `react-native-web`, `@expo/vector-icons`, `react-native-svg`
- `optimizeDeps.exclude`: excludes all `@gokan-srs/*` packages (handled by workspace-resolver, not esbuild)
- `server.watch.ignored`: ignores `public/data/compiled/**` to prevent Vite watching ~50k JSON files
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Production: `minify: 'terser'`, no sourcemaps

---

## Styling on Web

The web app uses a **hybrid styling approach**:

1. **`@gokan-srs/ui` StyleSheet utilities** (`styles.*`) — used for all shared components from `@gokan-srs/app`. These are React Native `StyleSheet` objects rendered to CSS by `react-native-web`.
2. **Tailwind CSS v4** — used for web-only layout/HTML elements (e.g., `index.html` shell, `index.css` global resets, font loading).

Do NOT use Tailwind classes on components that must work on native. Use `styles.*` there.

### Font Loading (Web)
Fonts are loaded via CSS `@font-face` in `index.css`:
- Source Serif 4 (English prose, quiz questions)
- Inter (English UI labels)
- Noto Serif JP (Japanese formal / kanji)
- Noto Sans JP (Japanese labels)

---

## Google Drive (Web) — `GoogleDriveContext.web.tsx`

Uses `@react-oauth/google`:
- `<GoogleOAuthProvider clientId="…">` wraps the app in `main.tsx`
- `useGoogleLogin()` hook triggers OAuth flow
- Token stored in memory; refresh handled by the library
- Calls `GoogleDriveSync` from `@gokan-srs/core` with the access token

---

## Development Commands

```bash
# From monorepo root:
bun run dev            # Start Vite dev server (http://localhost:5173)

# From apps/web:
bun run dev            # Same
bun run build          # Production build → dist/
bun run preview        # Preview dist/
bun run typecheck      # tsc --build
bun run lint           # ESLint
bun test               # Vitest (passWithNoTests)
```

---

## Deployment

- Deployed to **AWS S3 + CloudFront** via GitHub Actions (`.github/workflows/deploy.yml`)
- Tests must pass before deployment
- CloudFront cache invalidation covers both entry points and `/data/compiled/*`
- The `dist/` directory is the deployment artifact from `vite build`
