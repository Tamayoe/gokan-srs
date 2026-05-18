import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { styles, THEME } from '@gokan-srs/ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

export type LoaderProps = {
    title: string;
    description?: string;
}

const RippleRing = ({ anim }: { anim: Animated.Value }) => {
    const scale = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1.0],
    });
    const opacity = anim.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [0.45, 0.06, 0],
    });

    return (
        <Animated.View
            style={[
                styles.absolute,
                {
                    width: 220,
                    height: 220,
                    borderRadius: 110,
                    borderWidth: 1,
                    borderColor: THEME.colors.primary,
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        />
    );
};

export function Loader({ title, description }: LoaderProps) {
    const heartbeat = useRef(new Animated.Value(0)).current;
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Heartbeat cycle (3s)
        Animated.loop(
            Animated.timing(heartbeat, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        ).start();

        // Ripple 1 cycle (3s)
        Animated.loop(
            Animated.timing(ripple1, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        ).start();

        // Ripple 2 cycle (3s, delayed by 1.5s)
        const ripple2Delay = setTimeout(() => {
            Animated.loop(
                Animated.timing(ripple2, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: false,
                })
            ).start();
        }, 1500);

        // Fade in text
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();

        return () => clearTimeout(ripple2Delay);
    }, [heartbeat, ripple1, ripple2, fadeAnim]);

    // Interpolations for heartbeat animation
    const heartbeatScale = heartbeat.interpolate({
        inputRange: [0, 0.08, 0.22, 1.0],
        outputRange: [1, 1.11, 1.0, 1],
    });

    const textColor = heartbeat.interpolate({
        inputRange: [0, 0.08, 0.3, 1.0],
        outputRange: [THEME.colors.primary, THEME.colors.accent, THEME.colors.primary, THEME.colors.primary] as string[],
    });

    const strokeOpacity = heartbeat.interpolate({
        inputRange: [0, 0.08, 0.3, 1.0],
        outputRange: [0.45, 0.85, 0.5, 0.45],
    });

    return (
        <View style={[styles.flex1, styles.flexCenter, styles.bgBackground]}>
            <View style={[styles.flexCol, styles.alignCenter, styles.gap10]}>
                {/* Ripple & Breathing Logo Container */}
                <View style={[styles.relative, styles.flexCenter, { width: 220, height: 220 }]}>
                    <RippleRing anim={ripple1} />
                    <RippleRing anim={ripple2} />

                    <Animated.View style={{ transform: [{ scale: heartbeatScale }], zIndex: 10 }}>
                        <Svg width="120" height="120" viewBox="0 0 100 100">
                            <AnimatedCircle
                                cx="50"
                                cy="50"
                                r="46"
                                stroke={THEME.colors.primary}
                                strokeWidth="1.2"
                                strokeOpacity={strokeOpacity}
                                fill="none"
                            />
                            <AnimatedSvgText
                                x="50"
                                y="50"
                                fontSize="34"
                                fontFamily={THEME.fonts.serif || 'Noto Serif JP'}
                                textAnchor="middle"
                                alignmentBaseline="central"
                                fill={textColor}
                                fontWeight="400"
                                letterSpacing="2"
                            >
                                語感
                            </AnimatedSvgText>
                        </Svg>
                    </Animated.View>
                </View>

                {/* Loading text */}
                <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                    <Animated.Text style={[styles.textPrimary, styles.fontSerif, styles.textLg, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
                        {title}
                    </Animated.Text>
                    {description && (
                        <Animated.Text style={[styles.textSecondary, styles.textSm, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
                            {description}
                        </Animated.Text>
                    )}
                </View>
            </View>
        </View>
    );
}
