import React from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from 'react-native';

interface CardContentProps {
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function CardContent({ children, style }: CardContentProps) {
    return (
        <View style={[{ paddingHorizontal: 24, paddingVertical: 20 }, style]}>
            {children}
        </View>
    );
}