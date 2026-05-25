import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { Icon } from "@gokan-srs/app/components/Icon";
import { styles, THEME } from "@gokan-srs/ui";

interface BaseQuizCardProps {
    children: React.ReactNode;
    inputLabel: string;
    inputPlaceholder: string;
    renderCorrectAnswer?: () => React.ReactNode;
    onInputFocus?: () => void;
    onInputBlur?: () => void;
}

export function BaseQuizCard({
    children,
    inputLabel,
    inputPlaceholder,
    renderCorrectAnswer,
    onInputFocus,
    onInputBlur
}: BaseQuizCardProps) {
    const { state, actions, computed } = useQuiz();
    const { isMobile } = useResponsive();

    const [isInputFocused, setIsInputFocused] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    const { currentVocab, userAnswer, feedback } = state;

    const isCompact = isMobile && isInputFocused && !feedback?.show;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(10)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const feedbackHeightAnim = useRef(new Animated.Value(0)).current;
    const correctScaleAnim = useRef(new Animated.Value(0.95)).current;

    // Mount animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
            Animated.timing(translateAnim, { toValue: 0, duration: 300, useNativeDriver: false })
        ]).start();
    }, [fadeAnim, translateAnim]);

    useEffect(() => {
        if (feedback?.show && !feedback.correct) {
            // Shake
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: -5, duration: 80, useNativeDriver: false }),
                Animated.timing(shakeAnim, { toValue: 5, duration: 80, useNativeDriver: false }),
                Animated.timing(shakeAnim, { toValue: -5, duration: 80, useNativeDriver: false }),
                Animated.timing(shakeAnim, { toValue: 5, duration: 80, useNativeDriver: false }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: false })
            ]).start();

            // Expand feedback area
            Animated.timing(feedbackHeightAnim, { toValue: 100, duration: 200, useNativeDriver: false }).start();
        } else if (feedback?.show && feedback.correct) {
            // Correct pop
            Animated.timing(correctScaleAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
        }
    }, [feedback?.show, feedback?.correct]);

    useEffect(() => {
        if (!feedback?.show) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [feedback?.show, currentVocab?.id]);

    const handleSubmit = () => {
        if (!feedback?.show) {
            actions.submitAnswer();
        } else if (computed.canContinue) {
            actions.continueToNext().then();
        }
    };

    if (!currentVocab) return null;

    return (
        <Animated.View style={[styles.wFull, { opacity: fadeAnim, transform: [{ translateY: translateAnim }, { translateX: shakeAnim }] }]}>
            <Card size="lg" style={isMobile ? [styles.p4] : undefined}>
                {children}

                <CardSection style={isCompact ? [styles.mb0] : undefined}>
                    <View style={[styles.flexCol, isCompact ? styles.gap2 : styles.gap4]}>
                        <View style={[styles.relative, styles.wFull]}>
                            <Text style={[styles.mb2, styles.textSecondary, styles.fontGothic, styles.fontMedium, isMobile ? styles.textXs : styles.textSm]}>
                                {inputLabel}
                            </Text>
                            <TextInput
                                ref={inputRef}
                                value={userAnswer}
                                onChangeText={(text) => actions.setAnswer(text)}
                                onFocus={() => { setIsInputFocused(true); onInputFocus?.(); }}
                                onBlur={() => { setIsInputFocused(false); onInputBlur?.(); }}
                                onSubmitEditing={handleSubmit}
                                placeholder={inputPlaceholder}
                                placeholderTextColor={THEME.colors.inputPlaceholder}
                                editable={!feedback?.show}
                                autoCorrect={false}
                                autoCapitalize="none"
                                spellCheck={false}
                                style={[
                                    styles.wFull, styles.border, styles.textCenter, styles.fontGothic, styles.bgSurface, styles.textPrimary,
                                    isMobile ? [styles.px3, styles.py2, styles.textLg] : [styles.px4, styles.py3, styles.textXl],
                                    {
                                        borderRadius: 8,
                                        borderColor: feedback?.show && !feedback.correct 
                                            ? THEME.colors.error 
                                            : isInputFocused 
                                                ? THEME.colors.accent 
                                                : THEME.colors.divider,
                                        opacity: feedback?.show ? 0.8 : 1,
                                        outlineStyle: 'none'
                                    } as any
                                ]}
                            />
                        </View>

                        {/* Incorrect / Minor Feedback */}
                        {feedback?.show && !feedback.correct && (
                            <Animated.View style={[
                                styles.bgFeedbackBackground, styles.border, styles.p4,
                                {
                                    borderRadius: 4,
                                    borderLeftWidth: 4,
                                    borderColor: THEME.colors.divider,
                                    borderLeftColor: feedback.type === 'minor_error' ? THEME.colors.secondary : THEME.colors.errorAccent,
                                    maxHeight: feedbackHeightAnim,
                                    overflow: 'hidden'
                                }
                            ]}>
                                <Text style={[styles.textXs, styles.textSecondary, styles.fontGothic, styles.mb2, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                    Correct answer
                                </Text>
                                {feedback.type === 'minor_error' && (
                                    <Text style={[styles.textSm, styles.textSecondary, styles.fontGothic, styles.mb2]}>
                                        {feedback.message}
                                    </Text>
                                )}
                                <View style={[styles.flexCol, styles.alignCenter]}>
                                    <View style={[styles.mb1]}>
                                        {renderCorrectAnswer ? renderCorrectAnswer() : (
                                            <Text style={[styles.textXl, styles.textPrimary, styles.fontGothic, styles.textCenter]}>
                                                {feedback.matchedAnswer}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Animated.View>
                        )}

                        {/* Correct Feedback */}
                        {feedback?.show && feedback.correct && (
                            <Animated.View style={[
                                styles.bgSurface, styles.border, styles.p4, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.gap2,
                                { borderRadius: 4, borderColor: THEME.colors.accent, transform: [{ scale: correctScaleAnim }] }
                            ]}>
                                <Icon name="check-circle-outline" size={20} color={THEME.colors.accent} />
                                <Text style={[styles.textSm, styles.fontMedium, styles.fontGothic, { color: THEME.colors.accent }]}>
                                    {feedback.message}
                                </Text>
                            </Animated.View>
                        )}

                        {/* Action Button */}
                        {!feedback?.show ? (
                            <View style={[styles.wFull]}>
                                <Pressable
                                    disabled={!computed.canSubmit || state.isEvaluatingAi}
                                    onPress={handleSubmit}
                                    style={({ pressed }: any) => [
                                        styles.wFull, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.gap2,
                                        isMobile ? [styles.h10, styles.mt4] : [styles.h12, styles.mt6],
                                        { borderRadius: 8 },
                                        computed.canSubmit && !state.isEvaluatingAi
                                            ? { backgroundColor: pressed ? THEME.colors.accentHover : THEME.colors.accent, boxShadow: pressed ? '0px 1px 4px rgba(0,0,0,0.1)' : '0px 2px 4px rgba(0,0,0,0.1)' }
                                            : { backgroundColor: THEME.colors.accentMuted }
                                    ] as any}
                                >
                                    {state.isEvaluatingAi ? (
                                        <>
                                            <Icon name="loading" size={16} color={THEME.colors.surface} style={{ opacity: 0.8 }} />
                                            <Text style={[styles.fontMedium, styles.fontSerif, { color: THEME.colors.surface }]}>Evaluating...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={[styles.fontMedium, styles.fontSerif, { color: computed.canSubmit ? THEME.colors.surface : THEME.colors.surfaceMuted }]}>Submit</Text>
                                            {computed.canSubmit && <Text style={[{ fontSize: 12, opacity: 0.7, color: THEME.colors.surface }]}>⏎</Text>}
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        ) : (
                            (!feedback.correct || state.currentQuizItem?.quizType === 'meaning') && (
                                <Pressable
                                    onPress={handleSubmit}
                                    style={({ pressed }: any) => [
                                        styles.wFull, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.gap2,
                                        isMobile ? [styles.h10, styles.mt4] : [styles.h12, styles.mt6],
                                        { borderRadius: 8, backgroundColor: pressed ? THEME.colors.accentHover : THEME.colors.accent, boxShadow: pressed ? '0px 1px 4px rgba(0,0,0,0.1)' : '0px 2px 4px rgba(0,0,0,0.1)' }
                                    ] as any}
                                >
                                    <Text style={[styles.fontMedium, styles.fontSerif, { color: THEME.colors.surface }]}>Continue</Text>
                                    <Text style={[{ fontSize: 12, opacity: 0.7, color: THEME.colors.surface }]}>⏎</Text>
                                </Pressable>
                            )
                        )}
                    </View>
                </CardSection>
            </Card>
        </Animated.View>
    );
}
