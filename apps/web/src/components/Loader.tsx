import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { styles, THEME } from '@gokan-srs/ui';

export type LoaderProps = {
    title: string;
    description?: string;
}

export function Loader({ title, description }: LoaderProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.98,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Spin animation
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Fade in text
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [pulseAnim, spinAnim, fadeAnim]);

    const getRotationWithDelay = (delayRatio: number) => {
        return spinAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [`${delayRatio * 360}deg`, `${(delayRatio * 360) + 360}deg`],
        });
    };

    return (
        <View style={[styles.flex1, styles.flexCenter, styles.bgBackground]}>
            <View style={[styles.flexCol, styles.alignCenter, styles.gap8]}>
                {/* Animated Kanji Logo */}
                <View style={[styles.relative, { width: 120, height: 120 }]}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], opacity: pulseAnim }}>
                        <Svg width="120" height="120" viewBox="0 0 100 100">
                            <Circle
                                cx="50"
                                cy="50"
                                r="46"
                                stroke={THEME.colors.primary}
                                strokeWidth="3"
                                fill="none"
                            />
                            <SvgText
                                x="50"
                                y="50"
                                fontSize="34"
                                fontFamily={THEME.fonts.mincho}
                                textAnchor="middle"
                                alignmentBaseline="central"
                                fill={THEME.colors.primary}
                                fontWeight="400"
                            >
                                語感
                            </SvgText>
                        </Svg>
                    </Animated.View>

                    {/* Orbiting dots */}
                    <Animated.View style={[styles.absolute, styles.inset0, { transform: [{ rotate: getRotationWithDelay(0) }] }]}>
                        <View style={[styles.absolute, { top: 0, left: '50%', transform: [{ translateX: -4 }], width: 8, height: 8, backgroundColor: THEME.colors.primary, borderRadius: 4, opacity: 0.6 }]} />
                    </Animated.View>
                    <Animated.View style={[styles.absolute, styles.inset0, { transform: [{ rotate: getRotationWithDelay(0.125) }] }]}>
                        <View style={[styles.absolute, { bottom: 0, left: '50%', transform: [{ translateX: -4 }], width: 8, height: 8, backgroundColor: THEME.colors.primary, borderRadius: 4, opacity: 0.6 }]} />
                    </Animated.View>
                    <Animated.View style={[styles.absolute, styles.inset0, { transform: [{ rotate: getRotationWithDelay(0.25) }] }]}>
                        <View style={[styles.absolute, { top: '50%', left: 0, transform: [{ translateY: -4 }], width: 8, height: 8, backgroundColor: THEME.colors.primary, borderRadius: 4, opacity: 0.6 }]} />
                    </Animated.View>
                    <Animated.View style={[styles.absolute, styles.inset0, { transform: [{ rotate: getRotationWithDelay(0.375) }] }]}>
                        <View style={[styles.absolute, { top: '50%', right: 0, transform: [{ translateY: -4 }], width: 8, height: 8, backgroundColor: THEME.colors.primary, borderRadius: 4, opacity: 0.6 }]} />
                    </Animated.View>
                </View>

                {/* Loading text */}
                <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                    <Animated.Text style={[styles.textPrimary, styles.fontSerif, styles.textLg, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
                        {title}
                    </Animated.Text>
                    {description && (
                        <Animated.Text style={[styles.textSecondary, styles.textSm, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
                            {description}
                        </Animated.Text>
                    )}
                </View>
            </View>
        </View>
    );
}
