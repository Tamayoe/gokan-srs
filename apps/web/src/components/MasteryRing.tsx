import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { CONSTANTS } from "@gokan-srs/core/commons/constants";
import { THEME, styles } from "@gokan-srs/ui";

interface MasteryRingProps {
    memoryStrength: number; // SRS Memory Strength
    size?: number;
    showText?: boolean;
    variant?: 'default' | 'reading' | 'meaning';
}

export const MasteryRing: React.FC<MasteryRingProps> = ({ memoryStrength, size = 30, showText = true, variant = 'default' }) => {
    const getPercentages = (strength: number) => {
        const sMin = CONSTANTS.srs.formula.minMemoryStrength;
        const sSoft = CONSTANTS.srs.formula.mastery.visualSoftCap;
        const sMax = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

        if (strength <= sMin) return { p1: 0, p2: 0 };

        // Loop 1: 0 -> Soft Cap (User Mastery)
        let p1 = 0;
        if (strength >= sSoft) {
            p1 = 100;
        } else {
            const numer = Math.log(strength / sMin);
            const denom = Math.log(sSoft / sMin);
            p1 = (numer / denom) * 100;
        }

        // Loop 2: Soft Cap -> Max Cap (Diamond Mastery)
        let p2 = 0;
        if (strength > sSoft) {
            const numer = Math.log(strength / sSoft);
            const denom = Math.log(sMax / sSoft);
            p2 = (numer / denom) * 100;
        }

        return {
            p1: Math.min(Math.max(p1, 0), 100),
            p2: Math.min(Math.max(p2, 0), 100)
        };
    };

    const { p1, p2 } = getPercentages(memoryStrength);

    // Stroke width relative to size
    const strokeWidth = Math.max(1.5, size / 16);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Offsets
    const offset1 = circumference - (p1 / 100) * circumference;
    const offset2 = circumference - (p2 / 100) * circumference;


    // Text Visibility logic
    const shouldShowText = showText && size >= 30;
    // Increased font size matching body weight
    const fontSize = size * 0.35;

    // Percentage text to show
    const displayPercentage = Math.round(p1);

    // Color Logic
    let loop1Color: string = THEME.mastery.loop1;
    let loop2Color: string = THEME.mastery.reading.loop1; // Default fallback for loop2 now solid

    // We simplified THEME.mastery colors. Now we just use the solid loop1 color.
    if (variant === 'reading') {
        loop1Color = THEME.mastery.reading.loop1;
        loop2Color = THEME.mastery.reading.loop1;
    } else if (variant === 'meaning') {
        loop1Color = THEME.mastery.meaning.loop1;
        loop2Color = THEME.mastery.meaning.loop1;
    }

    return (
        <View style={[styles.relative, styles.flexCenter, { width: size, height: size }]}>
            <Svg
                style={[{ width: size, height: size }, { transform: [{ rotate: '-90deg' }] }]}
                viewBox={`0 0 ${size} ${size}`}
            >
                {/* Background Track */}
                <Circle
                    stroke={THEME.mastery.track}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />

                {/* Loop 1 (Learning Progress) */}
                <Circle
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset1}
                    strokeLinecap="round"
                    stroke={p2 > 0 ? THEME.mastery.track : loop1Color}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />

                {/* Loop 2 (Refining / Diamond / Shiny) */}
                {p2 > 0 && (
                    <Circle
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset2}
                        strokeLinecap="round"
                        stroke={loop2Color}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                )}
            </Svg>

            {shouldShowText && (
                <View style={[styles.absolute, styles.inset0, styles.flexCenter]}>
                    <Text
                        style={[
                            styles.fontBold,
                            { fontSize: fontSize, color: '#475569' }
                        ]}
                    >
                        {displayPercentage}
                    </Text>
                </View>
            )}
        </View>
    );
};