import React from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from 'react-native';
import { styles } from "@gokan-srs/ui";

interface CardSectionProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function CardSection({ children, style }: CardSectionProps) {
    return (
        <View style={[{ marginBottom: 40 }, style]}>
            {children}
        </View>
    );
}

export function CardDivider() {
    return (
        <View style={[styles.borderTop, { marginVertical: 32 }]} />
    );
}