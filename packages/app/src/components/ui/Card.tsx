import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import type { StyleProp, ViewStyle } from 'react-native';
import { styles, THEME } from "@gokan-srs/ui";

interface CardProps {
    interactive?: boolean;
    style?: StyleProp<ViewStyle>;
    size?: "sm" | "md" | "lg";
    children?: React.ReactNode;
    onPress?: () => void;
}

const SIZE_STYLES = {
    sm: { padding: 16, maxWidth: 448 },
    md: { padding: 32, maxWidth: 576 },
    lg: { padding: 48, maxWidth: 672 },
};

export function Card({
    children,
    interactive = false,
    size = "md",
    style,
    onPress,
}: CardProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                delay: 20,
                useNativeDriver: false,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 250,
                delay: 20,
                useNativeDriver: false,
            }),
        ]).start();
    }, [fadeAnim, translateY]);

    const innerContent = (
        <Animated.View
            style={[
                styles.wFull,
                styles.mxAuto,
                styles.bgSurface,
                styles.border,
                { borderRadius: 16 },
                SIZE_STYLES[size],
                { opacity: fadeAnim, transform: [{ translateY }] },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );

    if (interactive || onPress) {
        return (
            <Pressable onPress={onPress}>
                {({ pressed, hovered }: any) => (
                    <Animated.View
                        style={[
                            styles.wFull,
                            styles.mxAuto,
                            styles.bgSurface,
                            styles.border,
                            { borderRadius: 16 },
                            SIZE_STYLES[size],
                            { backgroundColor: pressed || hovered ? THEME.colors.surfaceHover : THEME.colors.surface },
                            { opacity: fadeAnim, transform: [{ translateY }] },
                            style,
                        ]}
                    >
                        {children}
                    </Animated.View>
                )}
            </Pressable>
        );
    }

    return innerContent;
}