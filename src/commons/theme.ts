export const THEME = {
    colors: {
        background: '#F6F4EF',
        feedbackBackground: '#F0EEE8',
        surface: '#FFFFFF',
        surfaceHover: '#DDDDDD',
        primary: '#1F2328',
        secondary: '#5F6368',
        tertiary: '#8B8E93',
        divider: '#D8D6D0',
        accent: '#2E3A59',
        accentHover: '#3D4A6B',
        error: '#8A3A2E',
        errorAccent: 'rgba(138, 58, 46, 0.45)', // 45% opacity
        inputPlaceholder: '#9AA0A6',
        meaningMuted: 'rgba(31, 35, 40, 0.6)', // primary with 60% opacity
        labelNeutral: '#8B8E93',
        muted: '#9ca3af',        // ← ADD THIS
        subtle: '#6b7280',      // optional, useful later
    },
    fonts: {
        serif: '"Source Serif 4", Georgia, serif',
        mincho: '"Noto Serif JP", serif',
        gothic: '"Sawarabi Gothic", "Noto Sans JP", sans-serif', // For UI text
    },
    fontSizes: {
        xs: '0.75rem',      // 12px
        labelSmall: '0.6875rem', // 11px for uppercase labels
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        kanji: '6.6rem',    // 105.6px (~10% increase from 96px)
    },
    spacing: {
        base: 8,
        labelMargin: 8,
        feedbackPadding: 16,
        buttonMarginTop: 28,
        errorBorderWidth: 2.5,
    },
    sizes: {
        buttonHeight: 44,
        borderRadius: 6,
    },
    transitions: {
        fast: '150ms',
        normal: '200ms',
        feedbackDelay: 400,
    },
} as const;