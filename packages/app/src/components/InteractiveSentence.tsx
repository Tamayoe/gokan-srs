import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import type { Sentence } from "@gokan-srs/core/models/sentence.model";
import { styles, THEME } from '@gokan-srs/ui';

interface InteractiveSentenceProps {
    sentence: Sentence;
    targetVocabId?: string;
    onVocabClick?: (vocabId: string) => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    showFurigana?: boolean;
    allowTargetClickable?: boolean;
}

export function InteractiveSentence({
    sentence,
    targetVocabId,
    onVocabClick,
    style,
    textStyle,
    showFurigana = false,
    allowTargetClickable = false
}: InteractiveSentenceProps) {
    const text = sentence.original;
    const matches = sentence.matches || {};

    interface Segment {
        type: 'text' | 'match';
        content: string;
        vocabId?: string;
        start: number;
        end: number;
        reading?: string;
    }

    const flatMatches: { vocabId: string, start: number, length: number, reading?: string }[] = [];
    for (const vocabId in matches) {
        const matchArray = matches[vocabId];
        if (Array.isArray(matchArray)) {
            for (const m of matchArray) {
                flatMatches.push({ vocabId, ...m });
            }
        } else if (matchArray) {
            // Fallback for old data format
            flatMatches.push({ vocabId, ...(matchArray as any) });
        }
    }

    flatMatches.sort((a, b) => a.start - b.start);

    const segments: Segment[] = [];
    let currentIndex = 0;

    for (const match of flatMatches) {
        // Skip if this match starts before current index (overlap handling: strict skip)
        if (match.start < currentIndex) continue;

        if (match.start > currentIndex) {
            segments.push({
                type: 'text',
                content: text.substring(currentIndex, match.start),
                start: currentIndex,
                end: match.start
            });
        }

        const end = match.start + match.length;
        segments.push({
            type: 'match',
            content: text.substring(match.start, end),
            vocabId: match.vocabId,
            start: match.start,
            end: end,
            reading: match.reading
        });
        currentIndex = end;
    }

    if (currentIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.substring(currentIndex),
            start: currentIndex,
            end: text.length
        });
    }

    const renderBlocks: React.ReactNode[] = [];

    segments.forEach((segment, i) => {
        if (segment.type === 'text') {
            Array.from(segment.content).forEach((char, charIdx) => {
                renderBlocks.push(
                    <View key={`text-${i}-${charIdx}`} style={[styles.flexCol, styles.justifyEnd]}>
                        <Text style={[styles.fontMincho, styles.textBase, textStyle, { lineHeight: 28 }]}>{char}</Text>
                    </View>
                );
            });
            return;
        }

        const isTarget = segment.vocabId === targetVocabId;
        const isClickable = !!onVocabClick && (!isTarget || allowTargetClickable);
        const rawReading = showFurigana && segment.type === 'match' ? segment.reading : null;
        const isKanaOnly = /^[\u3040-\u309F\u30A0-\u30FF]+$/.test(segment.content);
        const reading = rawReading && rawReading !== segment.content && !isKanaOnly ? rawReading : null;

        const renderWord = (isHovered: boolean = false) => (
            <View style={[styles.flexCol, styles.alignCenter, styles.justifyEnd]}>
                {reading ? (
                    <Text style={[styles.textTertiary, { fontSize: 10, marginBottom: -6, marginTop: 2 }]}>{reading}</Text>
                ) : (
                    <View style={{ height: 14 }} />
                )}
                <View style={[
                    isTarget ? { borderBottomWidth: 2, borderBottomColor: THEME.colors.accent + '40', marginHorizontal: 2, paddingHorizontal: 2 } : {},
                    isTarget && isClickable && isHovered ? { borderBottomColor: THEME.colors.accent } : {},
                    !isTarget && isClickable ? { borderBottomWidth: 1, borderBottomColor: THEME.colors.tertiary + '80', borderStyle: 'dashed', marginHorizontal: 2 } : {},
                    !isTarget && isClickable && isHovered ? { borderBottomColor: THEME.colors.accent } : {}
                ]}>
                    <Text style={[
                        styles.fontMincho,
                        styles.textBase,
                        { lineHeight: 28 },
                        isTarget ? [styles.textAccent, styles.fontBold] : {},
                        !isTarget && isClickable ? styles.textPrimary : {},
                        !isTarget && isClickable && isHovered ? styles.textAccent : {},
                        textStyle
                    ]}>
                        {segment.content}
                    </Text>
                </View>
            </View>
        );

        if (isClickable) {
            renderBlocks.push(
                <Pressable
                    key={`match-${i}`}
                    onPress={() => onVocabClick?.(segment.vocabId!)}
                >
                    {({ hovered }: any) => renderWord(hovered)}
                </Pressable>
            );
        } else {
            renderBlocks.push(
                <React.Fragment key={`match-${i}`}>
                    {renderWord(false)}
                </React.Fragment>
            );
        }
    });

    return (
        <View style={[styles.flexRow, styles.flexWrap, styles.alignEnd, style]}>
            {renderBlocks}
        </View>
    );
}
