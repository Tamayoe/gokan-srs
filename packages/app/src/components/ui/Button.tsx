import React from "react";
import { Pressable, Text } from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { styles, THEME } from "@gokan-srs/ui";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
    children?: React.ReactNode;
    variant?: ButtonVariant;
    onPress?: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

export function Button({
    children,
    variant = "primary",
    onPress,
    disabled = false,
    style,
    textStyle,
}: ButtonProps) {
    const isPrimary = variant === "primary";
    const isGhost = variant === "ghost";

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={(({ pressed, hovered }: any) => [
                styles.flexCenter,
                styles.roundedMd,
                { height: isGhost ? 'auto' : 44, paddingHorizontal: isGhost ? 8 : 16 },
                isPrimary
                    ? { backgroundColor: pressed || hovered ? THEME.colors.accentHover : THEME.colors.accent }
                    : isGhost
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: pressed || hovered ? THEME.colors.surface : THEME.colors.feedbackBackground, borderWidth: 1, borderColor: THEME.colors.divider },
                disabled && { opacity: 0.5 },
                style,
            ]) as any}
        >
            {({ pressed, hovered }: any) => (
                <Text
                    style={[
                        styles.fontSerif,
                        styles.textBase,
                        isPrimary
                            ? styles.textWhite
                            : isGhost
                                ? { color: pressed || hovered ? THEME.colors.primary : THEME.colors.secondary }
                                : styles.textPrimary,
                        textStyle,
                    ]}
                >
                    {children}
                </Text>
            )}
        </Pressable>
    );
}
