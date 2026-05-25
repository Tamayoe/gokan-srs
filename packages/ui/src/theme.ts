import { Platform } from 'react-native';
import { THEME as CORE_THEME } from '../../core/src/commons/theme';

// Native hex opacity variants (light mode defaults — dark mode handled by ThemeContext on native)
const NATIVE_OPACITY_VARIANTS = {
    accentFaint:   '#3D5A801A', // accent 10%
    accentLight:   '#3D5A8033', // accent 20%
    accentSubtle:  '#3D5A8040', // accent 25%
    accentSoft:    '#3D5A8066', // accent 40%
    accentMuted:   '#3D5A8080', // accent 50%
    dividerFaint:  '#E8E0D080', // divider 50%
    tertiaryLight: '#7D74664D', // tertiary 30%
    tertiarySoft:  '#7D746666', // tertiary 40%
    tertiaryMuted: '#7D746680', // tertiary 50%
    surfaceMuted:  '#FFFFFFCC', // surface 80%
};

export const THEME = Platform.OS === 'web' ? {
    ...CORE_THEME,
    colors: {
        ...CORE_THEME.colors,
        background: 'var(--background)' as any,
        feedbackBackground: 'var(--feedback-background)' as any,
        surface: 'var(--surface)' as any,
        surfaceHover: 'var(--surface-hover)' as any,
        primary: 'var(--primary)' as any,
        secondary: 'var(--secondary)' as any,
        tertiary: 'var(--tertiary)' as any,
        divider: 'var(--divider)' as any,
        accent: 'var(--accent)' as any,
        accentHover: 'var(--accent-hover)' as any,
        error: 'var(--error)' as any,
        errorAccent: 'var(--error-accent)' as any,
        inputPlaceholder: 'var(--input-placeholder)' as any,
        meaningMuted: 'var(--meaning-muted)' as any,
        labelNeutral: 'var(--label-neutral)' as any,
        muted: 'var(--muted)' as any,
        subtle: 'var(--subtle)' as any,
        // Opacity variants — safe for web CSS variables
        accentFaint:   'var(--accent-faint)' as any,
        accentLight:   'var(--accent-light)' as any,
        accentSubtle:  'var(--accent-subtle)' as any,
        accentSoft:    'var(--accent-soft)' as any,
        accentMuted:   'var(--accent-muted)' as any,
        dividerFaint:  'var(--divider-faint)' as any,
        tertiaryLight: 'var(--tertiary-light)' as any,
        tertiarySoft:  'var(--tertiary-soft)' as any,
        tertiaryMuted: 'var(--tertiary-muted)' as any,
        surfaceMuted:  'var(--surface-muted)' as any,
    },
    mastery: {
        ...CORE_THEME.mastery,
        track: 'var(--mastery-track, var(--divider))' as any,
        loop1: 'var(--mastery-loop1, var(--accent))' as any,
        reading: {
            loop1: 'var(--mastery-reading-loop1, var(--accent))' as any,
        },
        meaning: {
            loop1: 'var(--mastery-meaning-loop1, rgba(61, 90, 128, 0.6))' as any,
        }
    }
} : {
    ...CORE_THEME,
    colors: {
        ...CORE_THEME.colors,
        ...NATIVE_OPACITY_VARIANTS,
    },
};
