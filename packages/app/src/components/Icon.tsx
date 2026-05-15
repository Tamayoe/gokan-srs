/**
 * Platform-agnostic Icon component — mobile implementation.
 *
 * Uses @expo/vector-icons (MaterialCommunityIcons) on iOS/Android.
 * On web, this file is aliased to apps/web/src/components/Icon.tsx
 * via the workspace-resolver Vite plugin, which substitutes a lucide-react
 * implementation that never imports @expo/vector-icons.
 *
 * All callers should import from '@gokan-srs/app/components/Icon'.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface IconProps {
    name: IconName;
    size?: number;
    color?: string;
    /** React Native StyleProp<TextStyle> — only opacity/margin are forwarded on web. */
    style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
    return (
        <MaterialCommunityIcons
            name={name}
            size={size}
            color={color}
            style={style as any}
        />
    );
}
