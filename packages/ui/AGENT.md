# @gokan-srs/ui — Agent Context

> [!IMPORTANT]
> This package provides **design tokens and `StyleSheet` utility helpers** shared across
> `@gokan-srs/app` and both platform apps.
> It uses React Native `StyleSheet` — these styles work on both web (via `react-native-web`) and native.
> See the root [`AGENT.md`](../../AGENT.md) for the full project overview.
> See [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) for the full visual design guidelines.

## Package Structure

```
packages/ui/src/
├── index.ts      # Re-exports: { THEME, styles }
└── styles.ts     # StyleSheet.create() utility classes + THEME import
```

The `THEME` object itself lives in `packages/core/src/commons/theme.ts` and is re-exported from here for convenience.

---

## Design Principles

> Gokan SRS is a **study instrument, not a game**. The appearance must be calm, precise, and trustworthy.

- **Tone**: Neutral, Direct, Encouraging (no cheerleading)
- **Colors**: Minimize color use. Primary Accent (Indigo `#2E3A59`) for focus. Secondary Accent (Muted Vermilion `#8A3A2E`) ONLY for errors/warnings.
- **Animations**: Minimal (150–200ms), no bounce, `ease-in-out` only
- **Typography**: Source Serif 4 + Inter for English UI; Noto Serif JP + Noto Sans JP / Sawarabi Gothic for Japanese

---

## THEME Tokens (`packages/core/src/commons/theme.ts`)

```typescript
THEME.colors = {
    background,       // App background
    surface,          // Card / elevated surface
    feedbackBackground,
    primary,          // Primary text / indigo accent #2E3A59
    secondary,        // Secondary text
    tertiary,         // Muted / de-emphasized text
    muted,
    accent,           // Interactive accent (indigo family)
    error,            // Muted vermilion #8A3A2E — errors/warnings ONLY
    divider,          // Border / separator color
}

THEME.fonts = {
    serif,            // Source Serif 4 — English prose / quiz questions
    mincho,           // Noto Serif JP — Japanese formal / kanji display
    gothic,           // Noto Sans JP / Sawarabi Gothic — Japanese UI labels
}
```

Import: `import { THEME } from '@gokan-srs/ui'` or `import { THEME } from '@gokan-srs/core/commons/theme'`

---

## `styles` Utility Object (`src/styles.ts`)

A `StyleSheet.create()` dictionary of named utility styles, analogous to Tailwind utility classes but as RN StyleSheet values. Import and compose like:

```tsx
import { styles } from '@gokan-srs/ui';
<View style={[styles.flex1, styles.flexCol, styles.p4, styles.bgBackground]}>
```

### Available Categories

| Category | Examples |
|---|---|
| Layout | `flex1`, `flexGrow`, `flexRow`, `flexCol`, `flexCenter`, `flexWrap` |
| Justify / Align | `justifyCenter`, `justifyBetween`, `alignCenter`, `alignStart` |
| Gap | `gap1`–`gap12` (4px increments) |
| Backgrounds | `bgBackground`, `bgSurface`, `bgAccent`, `bgError`, `bgFeedbackBackground` |
| Text Colors | `textPrimary`, `textSecondary`, `textTertiary`, `textAccent`, `textError`, `textMuted`, `textWhite` |
| Font Family | `fontSerif`, `fontMincho`, `fontGothic` |
| Font Size | `textXs`–`text5xl`, `textKanji` (105.6px) |
| Font Weight | `fontNormal`, `fontMedium`, `fontSemibold`, `fontBold` |
| Text Align | `textCenter`, `textRight`, `textLeft` |
| Borders | `border`, `borderBottom`, `borderTop`, `roundedSm`–`roundedFull`, `borderAccent`, `borderError` |
| Margins | `mt1`–`mt8`, `mb1`–`mb16`, `ml1`–`ml4`, `mr2`/`mr4`, `mx1`/`mx2`, `my1`–`my8`, `mxAuto`, `m4` |
| Paddings | `p0`–`p8`, `pt2`–`pt8`, `pb4`/`pb6`/`pb12`, `px1`–`px8`, `py0_5`–`py12`, `pl3`/`pl4`, `pr4` |
| Size | `wFull`, `hFull`, `w10`, `h10`–`h14` |
| Position | `absolute`, `relative`, `inset0`, `overflowHidden` |
| Component | `card` (surface + shadow + border radius) |

> [!NOTE]
> For ad-hoc styles not covered by this sheet, use inline `style={{ ... }}` objects directly.
> Do NOT add one-off styles here; only add a utility if it will be used in 3+ places.

---

## Usage Pattern

```tsx
// Preferred: compose utility styles
<View style={[styles.flex1, styles.flexCol, styles.p4, styles.bgBackground]}>
  <Text style={[styles.text2xl, styles.fontBold, styles.textPrimary, styles.fontSerif]}>
    語感
  </Text>
</View>

// For dynamic/conditional styles, mix with inline objects
<View style={[styles.flex1, { maxWidth: 480 }]}>
```

When using `Pressable` with hover/pressed states (web-only RN-web extension):
```tsx
<Pressable style={({ pressed, hovered }: any) => [
    styles.px4, styles.py2,
    { opacity: pressed || hovered ? 1 : 0.7 }
] as any}>
```
