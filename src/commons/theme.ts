export const THEME = {
    colors: {
        background: '#F6F4EF',
        surface: '#FFFFFF',
        primary: '#1F2328',
        secondary: '#5F6368',
        tertiary: '#8B8E93',
        divider: '#D8D6D0',
        accent: '#2E3A59',
        accentHover: '#3D4A6B',
        error: '#8A3A2E',
        errorBg: '#FFF5F5',
    },
    fontSizes: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '8xl': '6rem',      // 96px
    },
    spacing: {
        base: '8px',
    },
    transitions: {
        fast: '150ms',
        normal: '200ms',
    },
} as const;