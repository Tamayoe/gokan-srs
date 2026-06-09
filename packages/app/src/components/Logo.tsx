import React from "react";
import { View, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { styles, THEME } from "@gokan-srs/ui";
import { useResponsive } from "../context/Responsive/useResponsive";

export const LogoMark: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        role="img"
        aria-label="Gokan SRS Logo"
    >
        {/* Thin circle ring — same seal as the loader */}
        <Circle cx="50" cy="50" r="46" stroke={THEME.colors.primary} strokeWidth="3" fill="none" />
        <SvgText
            x="50"
            y="50"
            fontSize="34"
            fontFamily={THEME.fonts.mincho}
            textAnchor="middle"
            alignmentBaseline="central"
            fill={THEME.colors.primary}
            fontWeight="400"
            letterSpacing="2"
        >
            語感
        </SvgText>
    </Svg>
);

export type LogoProps = {
    style?: StyleProp<ViewStyle>;
};

export const Logo: React.FC<LogoProps> = ({ style }) => {
    const { isMobile } = useResponsive();

    return (
        <View style={[styles.flexRow, styles.alignCenter, styles.gap3, style]}>
            <LogoMark size={isMobile ? 24 : 48} />
            <Text style={[styles.fontSerif, styles.textPrimary, isMobile ? styles.textBase : styles.text2xl, { letterSpacing: 0.5 }]}>
                Gokan SRS
            </Text>
        </View>
    );
};
