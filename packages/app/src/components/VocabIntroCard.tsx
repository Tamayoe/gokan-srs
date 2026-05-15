import React from "react";
import { View, Text } from "react-native";
import type { Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { Card } from "./ui/Card";
import { CardDivider, CardSection } from "./ui/CardSection";
import { Button } from "./ui/Button";
import { useResponsive } from "../context/Responsive/useResponsive";
import { Icon } from "@gokan-srs/app/components/Icon";
import { styles, THEME } from "@gokan-srs/ui";

interface IntroVocabCardProps {
    vocab: Vocabulary;
    onLearn: () => void;
    onSkip: () => void;
}

export default function VocabIntroCard({ vocab, onLearn, onSkip }: IntroVocabCardProps) {
    const { isMobile } = useResponsive();

    return (
        <Card size="lg">
            {/* Kanji */}
            <CardSection>
                <View style={[styles.flexCol, styles.alignCenter]}>
                    <View
                        style={[styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.gap3]}
                        accessibilityLabel={vocab.mergedVocabs && vocab.mergedVocabs.length > 1 ? "Merged Entry (combines multiple JMDict words)" : undefined}
                    >
                        <Text style={[styles.textPrimary, styles.fontMincho, styles.textKanji, { lineHeight: 105.6 }]}>
                            {vocab.writtenForm.kanji}
                        </Text>
                        {vocab.mergedVocabs && vocab.mergedVocabs.length > 1 && (
                            <Icon name="call-merge" size={40} color={THEME.colors.tertiary} />
                        )}
                    </View>

                    <View style={[styles.flexRow, styles.justifyCenter, styles.alignCenter, styles.gap1, styles.mt4]}>
                        <Text style={[styles.textBase, styles.fontGothic, styles.textSecondary]}>
                            {[vocab.reading.primary, ...vocab.reading.alternatives].join(', ')}
                        </Text>
                    </View>
                </View>
            </CardSection>

            {/* Meanings */}
            <CardSection>
                <View style={[styles.flexRow, styles.flexWrap, styles.justifyCenter]}>
                    <Text style={[styles.textCenter, styles.fontSerif, styles.textBase, { color: THEME.colors.meaningMuted, lineHeight: 24 }]}>
                        {vocab.senses.map((sense, i) => (
                            <React.Fragment key={i}>
                                {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                    <Text style={[styles.textXs, styles.textTertiary, styles.mr2, styles.fontGothic]}>
                                        [{sense.appliesToReadings.join(', ')}]
                                    </Text>
                                )}
                                {sense.glosses.join(', ')}
                                {i !== vocab.senses.length - 1 ? ', ' : ''}
                            </React.Fragment>
                        ))}
                    </Text>
                </View>
            </CardSection>

            <CardDivider />

            <View style={[styles.flexRow, styles.gap4]}>
                <Button
                    variant="secondary"
                    style={[styles.flex1]}
                    onPress={onSkip}
                >
                    {isMobile ? 'Skip' : 'I already know this'}
                </Button>

                <Button variant="primary" style={[styles.flex1]} onPress={onLearn}>
                    {isMobile ? 'Learn' : 'Learn this word'}
                </Button>
            </View>
        </Card>
    );
}
