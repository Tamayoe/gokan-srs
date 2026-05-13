import { useState } from 'react';
import { View, Text, Pressable } from "react-native";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { CONSTANTS } from "@gokan-srs/core/commons/constants";
import { MasteryRing } from "../../components/MasteryRing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TagsLookup, type Tags } from "@gokan-srs/core/models/data.model";
import { BaseQuizCard } from "./BaseQuizCard";
import { styles, THEME } from "@gokan-srs/ui";

interface QuizCardProps {
    onKanjiClick?: () => void;
}

export function QuizCard({ onKanjiClick }: QuizCardProps) {
    const { state, currentProgress } = useQuiz();
    const { isMobile } = useResponsive();

    const { currentVocab, feedback } = state;
    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentVocab) return null;

    const maxMobileDefs = 3;
    const maxDesktopDefs = 5;
    const currentMaxDefs = isMobile ? maxMobileDefs : maxDesktopDefs;
    const hasMoreDefs = currentVocab.senses.length > currentMaxDefs;
    
    const displayedSenses = isExpanded ? currentVocab.senses : currentVocab.senses.slice(0, currentMaxDefs);

    return (
        <BaseQuizCard
            inputLabel="Reading (hiragana)"
            inputPlaceholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
            renderCorrectAnswer={() => (
                <Text style={[styles.textCenter, styles.text2xl, styles.mb1, styles.textPrimary, styles.fontGothic]}>
                    {feedback?.type === 'minor_error'
                        ? feedback.matchedAnswer
                        : [currentVocab.reading.primary, ...currentVocab.reading.alternatives].join(', ')}
                </Text>
            )}
        >
            {isMobile ? (
                // Horizontal layout for all mobile views
                <View style={[styles.mb4]}>
                    {/* Kanji and info */}
                    <View style={[styles.flex1]}>
                        <Pressable
                            disabled={!(onKanjiClick && feedback?.show)}
                            onPress={() => feedback?.show && onKanjiClick?.()}
                            style={({ pressed }: any) => [
                                styles.relative, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.mb2,
                                { opacity: pressed && feedback?.show ? 0.8 : 1 }
                            ] as any}
                        >
                            <Text style={[styles.text5xl, styles.textPrimary, styles.fontMincho, { lineHeight: 56 }]}>
                                {currentVocab.writtenForm.kanji}
                            </Text>
                            {/* Merged Entry Icon */}
                            {currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 && (
                                <View style={[styles.absolute, { right: -24, top: -4 }]}>
                                    <MaterialCommunityIcons name="call-merge" size={18} color={THEME.colors.tertiary + '66'} />
                                </View>
                            )}
                        </Pressable>
                        {/* POS tags */}
                        {currentVocab.senses.length > 0 && (
                            <View style={[styles.flexRow, styles.flexWrap, styles.gap1]}>
                                {Array.from(
                                    new Set(
                                        currentVocab.senses.flatMap(sense => [
                                            ...sense.pos,
                                            ...(sense.misc?.rawTags ?? []),
                                        ])
                                    )
                                ).slice(0, 3).map(rawTag => (
                                    <View
                                        key={rawTag}
                                        style={[styles.px1_5, styles.py0_5, styles.bgFeedbackBackground, { borderRadius: 4 }]}
                                    >
                                        <Text style={[styles.textSecondary, styles.fontGothic, { fontSize: 9 }]}>
                                            {TagsLookup[rawTag as Tags]}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                // Desktop vertical layout
                <View>
                    {/* Top-right mastery */}
                    <View style={[styles.flexRow, styles.justifyEnd, styles.mb4]}>
                        <View style={[styles.flexCol, styles.alignCenter, styles.gap1]}>
                            <MasteryRing memoryStrength={currentProgress?.reading.memoryStrength ?? 0} size={50} variant="reading" />
                            <Text style={[styles.textTertiary, styles.fontGothic, styles.fontSemiBold, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }]}>
                                Mastery
                            </Text>
                        </View>
                    </View>

                    {/* Kanji Display */}
                    <View style={[styles.flexCol, styles.alignCenter, styles.mb8]}>
                        <View style={[styles.flexRow, styles.justifyCenter, styles.mb4]}>
                            <Pressable
                                disabled={!(onKanjiClick && feedback?.show)}
                                onPress={() => feedback?.show && onKanjiClick?.()}
                                style={({ pressed }: any) => [
                                    styles.relative, styles.flexRow, styles.alignStart,
                                    { opacity: pressed && feedback?.show ? 0.8 : 1 }
                                ] as any}
                            >
                                <Text style={[styles.textPrimary, styles.fontMincho, { fontSize: 80, lineHeight: 88 }]}>
                                    {currentVocab.writtenForm.kanji}
                                </Text>
                                {/* Merged Entry Icon */}
                                {currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 && (
                                    <View style={[styles.absolute, { right: -32, top: 0 }]}>
                                        <MaterialCommunityIcons name="call-merge" size={24} color={THEME.colors.tertiary + '4D'} />
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        {/* Disambiguation helpers */}
                        <View style={[styles.flexCol, styles.alignCenter, styles.py1, styles.gap3]}>
                            {/* POS + misc tags */}
                            {currentVocab.senses.length > 0 && (
                                <View style={[styles.flexRow, styles.flexWrap, styles.justifyCenter, styles.gap2]}>
                                    {Array.from(
                                        new Set(
                                            currentVocab.senses.flatMap(sense => [
                                                ...sense.pos,
                                                ...(sense.misc?.rawTags ?? []),
                                            ])
                                        )
                                    ).map(rawTag => (
                                        <View
                                            key={rawTag}
                                            style={[styles.px2, styles.py0_5, styles.bgFeedbackBackground, { borderRadius: 4 }]}
                                        >
                                            <Text style={[styles.textXs, styles.textSecondary, styles.fontGothic]}>
                                                {TagsLookup[rawTag as Tags]}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Related compounds */}
                            {Array.from(
                                new Set(
                                    currentVocab.senses.flatMap(
                                        sense => sense.related?.compounds ?? []
                                    )
                                )
                            ).length > 0 && (
                                    <Text style={[styles.textSm, styles.fontSerif, { color: THEME.colors.meaningMuted }]}>
                                        {Array.from(
                                            new Set(
                                                currentVocab.senses.flatMap(
                                                    sense => sense.related?.compounds ?? []
                                                )
                                            )
                                        ).slice(0, 4).join(' ・ ')}
                                    </Text>
                                )}
                        </View>
                    </View>
                </View>
            )}

            {/* Glosses — feedback only, all senses */}
            {feedback?.show && (
                <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                    {displayedSenses.map((sense, index) => (
                        <View key={index} style={[styles.flexRow, styles.flexWrap, styles.justifyCenter, styles.alignCenter]}>
                            {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mr2]}>
                                    [{sense.appliesToReadings.join(', ')}]
                                </Text>
                            )}
                            <Text style={[styles.textSm, styles.fontSerif, styles.textCenter, { color: THEME.colors.meaningMuted }]}>
                                {sense.glosses.join(', ')}
                            </Text>
                        </View>
                    ))}
                    
                    {hasMoreDefs && (
                        <Pressable onPress={() => setIsExpanded(!isExpanded)} style={({ pressed, hovered }: any) => [{ paddingVertical: 4, opacity: pressed || hovered ? 0.7 : 1 }] as any}>
                            <Text style={[styles.textXs, styles.textSecondary, styles.fontGothic]}>
                                {isExpanded ? "Show less" : `+${currentVocab.senses.length - currentMaxDefs} more definitions`}
                            </Text>
                        </Pressable>
                    )}
                </View>
            )}
        </BaseQuizCard>
    );
}
