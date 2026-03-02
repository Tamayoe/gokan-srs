import React, { useState } from 'react';
import { View, Text, Pressable } from "react-native";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup } from "@gokan-srs/core/models/data.model";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Tags } from "@gokan-srs/core/models/data.model";

import { BaseQuizCard } from "./BaseQuizCard";
import { InteractiveSentence } from "../../components/InteractiveSentence";
import { styles, THEME } from "@gokan-srs/ui";

interface MeaningQuizCardProps {
    onKanjiClick?: () => void;
    onVocabClick?: (vocabId: string) => void;
}

export function MeaningQuizCard({ onKanjiClick, onVocabClick }: MeaningQuizCardProps) {
    const { state, currentProgress } = useQuiz();
    const { isMobile } = useResponsive();

    // Get data from centralized state
    const { currentVocab, currentSentences, feedback, progress } = state;

    // Get persisted sentence from state
    const sentence = currentSentences && state.currentSentenceId
        ? currentSentences.find(s => s.id === state.currentSentenceId) || null
        : null;

    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentVocab || !progress) return null;

    const maxDefs = 5;
    const hasMoreDefs = currentVocab.senses.length > maxDefs;
    const displayedSenses = isExpanded ? currentVocab.senses : currentVocab.senses.slice(0, maxDefs);

    return (
        <BaseQuizCard
            inputLabel="Meaning (English)"
            inputPlaceholder="Type the meaning..."
            renderCorrectAnswer={() => (
                <Text style={[styles.textCenter, styles.textXl, styles.mb1, styles.textPrimary, styles.fontGothic]}>
                    {feedback?.matchedAnswer || currentVocab.senses.flatMap(s => s.glosses)[0] || "No meaning found"}
                </Text>
            )}
        >
            {/* Header: Meaning Quiz Label + Mastery */}
            <View style={[styles.flexCol, styles.alignCenter, styles.mb8]}>
                <View style={[styles.flexRow, styles.justifyEnd, styles.wFull, styles.mb4]}>
                    {!isMobile && (
                        <View style={[styles.flexCol, styles.alignCenter, styles.gap1, styles.mt4, { opacity: 0.5 }]}>
                            <MasteryRing memoryStrength={currentProgress?.meaning.memoryStrength ?? 0} size={50} variant="meaning" />
                            <Text style={[styles.textTertiary, styles.fontGothic, styles.fontSemiBold, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }]}>
                                Mastery
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.flexRow, styles.flexWrap, styles.justifyCenter, styles.alignCenter, { maxWidth: 672, marginHorizontal: 'auto' }]}>
                    {sentence ? (
                        <>
                            <Text style={[isMobile ? styles.textXl : styles.text2xl, styles.fontSerif, styles.textSecondary, styles.textCenter, { lineHeight: 32 }]}>
                                What is the original meaning of
                            </Text>
                            <Text style={[isMobile ? styles.textXl : styles.text2xl, styles.fontSerif, styles.textPrimary, styles.fontBold, styles.mx1, { lineHeight: 32 }]}>
                                {currentVocab.writtenForm.kanji}
                            </Text>
                            <Text style={[isMobile ? styles.textXl : styles.text2xl, styles.fontSerif, styles.textSecondary, styles.textCenter, { lineHeight: 32 }]}>
                                in this sentence?
                            </Text>
                        </>
                    ) : (
                        <Text style={[isMobile ? styles.textXl : styles.text2xl, styles.fontSerif, styles.textSecondary, styles.textCenter, { lineHeight: 32 }]}>
                            What is the meaning of this word?
                        </Text>
                    )}
                </View>
            </View>

            {/* Content: Sentence OR Kanji */}
            <View style={[styles.flexCol, styles.alignCenter, styles.mb6]}>
                {sentence ? (
                    <View style={[styles.wFull, styles.mb4]}>
                        <InteractiveSentence
                            sentence={sentence}
                            targetVocabId={currentVocab.id}
                            onVocabClick={onVocabClick}
                            showFurigana={feedback?.show}
                            allowTargetClickable={feedback?.show}
                            textStyle={[{ fontSize: 24, lineHeight: 36, textAlign: 'center' }]}
                        />
                    </View>
                ) : (
                    // Fallback to minimal Kanji display if no sentence
                    <View style={[styles.flexRow, styles.justifyCenter, styles.mb4]}>
                        <Pressable
                            disabled={!(onKanjiClick && feedback?.show)}
                            onPress={() => feedback?.show && onKanjiClick?.()}
                            style={({ pressed }: any) => [
                                styles.relative, styles.flexRow, styles.alignStart,
                                { opacity: pressed && feedback?.show ? 0.8 : 1 }
                            ] as any}
                        >
                            {feedback?.show ? (
                                <View style={[styles.flexCol, styles.alignCenter]}>
                                    <Text style={[styles.textSm, styles.fontSans, styles.textSecondary, { marginBottom: -8, zIndex: 1 }]}>{currentVocab.reading.primary}</Text>
                                    <Text style={[styles.textPrimary, styles.fontMincho, styles.text5xl, { lineHeight: 56 }]}>
                                        {currentVocab.writtenForm.kanji}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={[styles.textPrimary, styles.fontMincho, styles.text5xl, { lineHeight: 56 }]}>
                                    {currentVocab.writtenForm.kanji}
                                </Text>
                            )}
                            {/* Merged Entry Icon */}
                            {currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 && (
                                <View style={[styles.absolute, { right: -24, top: 0 }]}>
                                    <MaterialCommunityIcons name="call-merge" size={18} color={THEME.colors.tertiary + '66'} />
                                </View>
                            )}
                        </Pressable>
                    </View>
                )}

                {/* POS Tags */}
                {currentVocab.senses.length > 0 && (
                    <View style={[styles.flexRow, styles.flexWrap, styles.justifyCenter, styles.gap2, styles.mt2]}>
                        {Array.from(
                            new Set(
                                currentVocab.senses.flatMap(sense => [
                                    ...sense.pos,
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

            </View>

            {/* Glosses — feedback only */}
            {feedback?.show && (
                <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                    <Text style={[styles.fontBold, styles.textPrimary, styles.textSm, styles.fontSerif, styles.mb1]}>Meanings:</Text>
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
                                {isExpanded ? "Show less" : `+${currentVocab.senses.length - maxDefs} more definitions`}
                            </Text>
                        </Pressable>
                    )}

                    {sentence && sentence.en && (
                        <View style={[styles.mt4, styles.pt4, styles.border, styles.wFull, { borderTopWidth: 1, borderColor: THEME.colors.divider }]}>
                            <Text style={[styles.fontBold, styles.textPrimary, styles.textSm, styles.fontSerif, styles.mb1, styles.textCenter]}>Translation:</Text>
                            <Text style={[styles.textSm, styles.fontSerif, styles.textSecondary, styles.textCenter, { fontStyle: 'italic' }]}>
                                {sentence.en[0].text}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </BaseQuizCard>
    );
}
