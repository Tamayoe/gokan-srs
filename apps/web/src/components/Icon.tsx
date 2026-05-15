/**
 * Web implementation of the platform-agnostic Icon component.
 *
 * This file overrides `packages/app/src/components/Icon.tsx` for the web build
 * via the workspace-resolver Vite plugin. It uses lucide-react (pure SVG, zero
 * native dependencies) so @expo/vector-icons is never imported by the web bundle.
 *
 * To add a new icon:
 *  1. Add the usage in packages/app with the MCIcon name
 *  2. Find the equivalent lucide icon at https://lucide.dev/icons/
 *  3. Add the mapping here
 */
import React from 'react';
import type { IconProps } from '@gokan-srs/app/components/Icon';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    BookOpen,
    CheckCircle,
    CheckCircle2,
    ChevronRight,
    ChartBar,
    Cloud,
    CloudCheck,
    GitMerge,
    GraduationCap,
    Key,
    Loader2,
    LockOpen,
    LogIn,
    Monitor,
    Moon,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Sun,
    Users,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

/**
 * Mapping from MaterialCommunityIcons name → Lucide component.
 * Semantic equivalents are used where no exact match exists.
 */
const ICON_MAP: Record<string, LucideIcon> = {
    'alert-circle':          AlertCircle,
    'arrow-down':            ArrowDown,
    'arrow-up':              ArrowUp,
    'book-open-variant':     BookOpen,
    'call-merge':            GitMerge,
    'chart-bar':             ChartBar,
    'check-circle':          CheckCircle2,
    'check-circle-outline':  CheckCircle,
    'chevron-right':         ChevronRight,
    'close-circle':          XCircle,
    'cloud':                 Cloud,
    'cloud-check':           CloudCheck,
    'cog':                   Settings,
    'group':                 Users,
    'key':                   Key,
    'loading':               Loader2,
    'lock-open':             LockOpen,
    'login':                 LogIn,
    'magnify':               Search,
    'monitor':               Monitor,
    'moon-waning-crescent':  Moon,
    'refresh':               RefreshCw,
    'school':                GraduationCap,
    'star-four-points':      Sparkles,
    'white-balance-sunny':   Sun,
};

/**
 * Converts a subset of React Native style props to CSS properties.
 * Only the props actually used across the codebase are handled.
 */
function rnStyleToCSS(style: IconProps['style']): React.CSSProperties {
    if (!style) return {};
    const flat: Record<string, unknown> = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : (style as Record<string, unknown>);
    const css: React.CSSProperties = {};
    if (flat.opacity     !== undefined) css.opacity     = flat.opacity     as number;
    if (flat.marginRight !== undefined) css.marginRight = flat.marginRight as number;
    if (flat.marginLeft  !== undefined) css.marginLeft  = flat.marginLeft  as number;
    if (flat.marginTop   !== undefined) css.marginTop   = flat.marginTop   as number;
    if (flat.marginBottom!== undefined) css.marginBottom= flat.marginBottom as number;
    if (flat.position    !== undefined) css.position    = flat.position    as 'absolute' | 'relative';
    if (flat.top         !== undefined) css.top         = flat.top         as number;
    if (flat.left        !== undefined) css.left        = flat.left        as number;
    if (flat.zIndex      !== undefined) css.zIndex      = flat.zIndex      as number;
    return css;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
    const LucideComponent = ICON_MAP[name as string];

    if (!LucideComponent) {
        if (import.meta.env.DEV) {
            console.warn(`[Icon] No web mapping for MCIcon "${name}". Add it to apps/web/src/components/Icon.tsx.`);
        }
        return null;
    }

    const spanStyle: React.CSSProperties = {
        display: 'inline-flex',
        flexShrink: 0,
        // Spin animation for the loading indicator
        ...(name === 'loading' ? { animation: 'icon-spin 1s linear infinite' } : {}),
        ...rnStyleToCSS(style),
    };

    return (
        <span style={spanStyle}>
            <LucideComponent size={size} color={color} strokeWidth={1.5} />
        </span>
    );
}
