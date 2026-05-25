import { useEffect, useRef } from 'react';
import { Animated, Easing, View, Platform } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { styles, THEME } from '@gokan-srs/ui';

export type LoaderProps = {
    title: string;
    description?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

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
    if (Platform.OS === 'web') {
        return (
            <div style={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: THEME.colors.background,
                flex: 1,
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '40px',
                }}>
                    {/* Breathing Seal Logo with ripple rings */}
                    <div className="ripple-container" style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '220px',
                        height: '220px',
                    }}>
                        {/* Ripple rings — triggered in sync with the heartbeat */}
                        <div className="animate-ripple" style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            opacity: 0,
                            animationDelay: '0s',
                            border: `1px solid ${THEME.colors.primary}`,
                        }} />
                        <div className="animate-ripple" style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            opacity: 0,
                            animationDelay: '1.5s',
                            border: `1px solid ${THEME.colors.primary}`,
                        }} />

                        {/* Circular seal: thin ring + 語感 inside */}
                        <svg
                            width="120"
                            height="120"
                            viewBox="0 0 100 100"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="animate-heartbeat"
                            style={{
                                position: 'relative',
                                zIndex: 10,
                            }}
                        >
                            {/* Thin circle ring — the seal frame */}
                            <circle
                                cx="50"
                                cy="50"
                                r="46"
                                className="animate-color-stroke"
                                stroke={THEME.colors.primary}
                                strokeWidth="1.2"
                                fill="none"
                            />

                            {/* 語感 side by side, centered inside the circle */}
                            <text
                                x="50"
                                y="50"
                                fontSize="34"
                                fontFamily={THEME.fonts.serif || 'Noto Serif JP'}
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="animate-color-breathe"
                                fontWeight="400"
                                letterSpacing="2"
                                fill={THEME.colors.primary}
                            >
                                語感
                            </text>
                        </svg>
                    </div>

                    {/* Loading text */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <p className="animate-fade-in" style={{
                            color: THEME.colors.primary,
                            fontFamily: THEME.fonts.serif || 'Noto Serif JP',
                            fontSize: '18px',
                            margin: 0,
                        }}>
                            {title}
                        </p>
                        {description && (
                            <p className="animate-fade-in" style={{
                                color: THEME.colors.secondary,
                                fontSize: '14px',
                                margin: 0,
                                animationDelay: '0.2s',
                            }}>
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <style>{`
                    /* Heartbeat: quick thump, then settle */
                    @keyframes heartbeat {
                        0% {
                            transform: scale(1);
                        }
                        8% {
                            transform: scale(1.11);
                        }
                        22% {
                            transform: scale(1.0);
                        }
                        100% {
                            transform: scale(1);
                        }
                    }

                    /* Text color pulse — brightens at the beat */
                    @keyframes color-breathe {
                        0%, 100% {
                            fill: ${THEME.colors.primary};
                            opacity: 0.85;
                        }
                        8% {
                            fill: ${THEME.colors.accent};
                            opacity: 1;
                        }
                        30% {
                            fill: ${THEME.colors.primary};
                            opacity: 0.9;
                        }
                    }

                    /* Circle stroke pulse — matches the text */
                    @keyframes color-stroke {
                        0%, 100% {
                            stroke-opacity: 0.45;
                        }
                        8% {
                            stroke-opacity: 0.85;
                        }
                        30% {
                            stroke-opacity: 0.5;
                        }
                    }

                    /* Ripple: quick surge then dissolve */
                    @keyframes ripple {
                        0% {
                            transform: scale(0.5);
                            opacity: 0.45;
                        }
                        70% {
                            opacity: 0.06;
                        }
                        100% {
                            transform: scale(1);
                            opacity: 0;
                        }
                    }

                    @keyframes fade-in {
                        from {
                            opacity: 0;
                            transform: translateY(8px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .animate-heartbeat {
                        animation: heartbeat 3s ease-out infinite;
                        transform-origin: center;
                    }

                    .animate-color-breathe {
                        animation: color-breathe 3s ease-out infinite;
                    }

                    .animate-color-stroke {
                        animation: color-stroke 3s ease-out infinite;
                    }

                    /* Same 3s cycle — locked to the heartbeat */
                    .animate-ripple {
                        animation: ripple 3s ease-out infinite;
                    }

                    .animate-fade-in {
                        animation: fade-in 0.6s ease-out forwards;
                        opacity: 0;
                    }
                `}</style>
            </div>
        );
    }

    // Native version using Animated
    const heartbeat = useRef(new Animated.Value(0)).current;
    const colorBreathe = useRef(new Animated.Value(0)).current;
    const ripple1 = useRef(new Animated.Value(0)).current;
    const ripple2 = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Native-driven layout loops (scale & fade)
        Animated.loop(
            Animated.timing(heartbeat, {
                toValue: 1,
                duration: 3000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.timing(ripple1, {
                toValue: 1,
                duration: 3000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        ).start();

        const ripple2Delay = setTimeout(() => {
            Animated.loop(
                Animated.timing(ripple2, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                })
            ).start();
        }, 1500);

        // JS-driven color loop (cannot use native driver)
        Animated.loop(
            Animated.timing(colorBreathe, {
                toValue: 1,
                duration: 3000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            })
        ).start();

        // Fade-in layout animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        return () => clearTimeout(ripple2Delay);
    }, [heartbeat, colorBreathe, ripple1, ripple2, fadeAnim]);

    const heartbeatScale = heartbeat.interpolate({
        inputRange: [0, 0.08, 0.22, 1.0],
        outputRange: [1, 1.11, 1.0, 1],
    });

    const textColor = colorBreathe.interpolate({
        inputRange: [0, 0.08, 0.3, 1.0],
        outputRange: [THEME.colors.primary, THEME.colors.accent, THEME.colors.primary, THEME.colors.primary] as string[],
    });

    const strokeOpacity = colorBreathe.interpolate({
        inputRange: [0, 0.08, 0.3, 1.0],
        outputRange: [0.45, 0.85, 0.5, 0.45],
    });

    return (
        <View style={[styles.flex1, styles.flexCenter, styles.bgBackground]}>
            <View style={[styles.flexCol, styles.alignCenter, { gap: 40 }]}>
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

                <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                    <Animated.Text style={[
                        styles.textPrimary, 
                        styles.fontSerif, 
                        styles.textLg, 
                        { 
                            opacity: fadeAnim, 
                            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] 
                        }
                    ]}>
                        {title}
                    </Animated.Text>
                    {description && (
                        <Animated.Text style={[
                            styles.textSecondary, 
                            styles.textSm, 
                            { 
                                opacity: fadeAnim, 
                                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] 
                            }
                        ]}>
                            {description}
                        </Animated.Text>
                    )}
                </View>
            </View>
        </View>
    );
}
