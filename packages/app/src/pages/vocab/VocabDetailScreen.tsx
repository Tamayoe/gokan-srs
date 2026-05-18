import { useEffect, useState } from "react";
import { useAppNavigation } from "../../context/NavigationContext";
import { View, Text, ScrollView } from "react-native";
import type { Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { Card } from "../../components/ui/Card";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup, type Tags } from "@gokan-srs/core/models/data.model";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { useQuiz } from "../../context/useQuiz";
import { VocabularyService } from "@gokan-srs/core/services/vocabulary.service";
import { Button } from "../../components/ui/Button";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Icon } from "@gokan-srs/app/components/Icon";
import { VocabSentencesCard } from "./VocabSentencesCard";
import { VocabHistoryGraph } from "../../components/VocabHistoryGraph";
import { ReviewTimeline } from "../../components/ReviewTimeline";
import { VocabRelationshipsCard } from "./VocabRelationshipsCard";
import { styles, THEME } from "@gokan-srs/ui";

function compoundList(compounds: string[]) {
    return compounds.map((compound, i) => (
        <View key={i} style={[styles.flexRow, styles.alignCenter]}>
            <Text style={[styles.textLg, styles.fontMincho, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                {compound}
            </Text>
            {i < compounds.length - 1 && (
                <Text style={[styles.textDivider, styles.mx2]}>|</Text>
            )}
        </View>
    ));
}

export default function VocabDetailScreen() {
    const navigation = useAppNavigation();
    const vocabId = navigation.getParam('vocabId');
    const { isMobile } = useResponsive();
    const { state } = useQuiz();
    const [vocab, setVocab] = useState<Vocabulary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!vocabId) return;

        VocabularyService.loadVocab(vocabId)
            .then(setVocab)
            .catch(err => {
                console.error("Failed to load vocab", err);
                setError("Could not load vocabulary details.");
            });
    }, [vocabId]);

    const progress = state.progress?.learningQueue.find(p => p.vocabId === vocabId);

    if (error) {
        return (
            <View style={[styles.flex1, styles.flexCenter, styles.p4]}>
                <View style={[styles.flexCol, styles.alignCenter]}>
                    <Text style={[styles.textXl, styles.fontBold, styles.textError, styles.mb2, styles.textCenter]}>Error</Text>
                    <Text style={[styles.textSecondary, styles.mb4]}>{error}</Text>
                    <Button variant="primary" onPress={() => navigation.goBack()}>Go Back</Button>
                </View>
            </View>
        );
    }

    if (!vocab) {
        return <LoadingScreen />;
    }



    return (
        <ScrollView style={[styles.flex1, styles.wFull, styles.bgBackground]} contentContainerStyle={[styles.alignCenter, isMobile ? styles.px4 : styles.px8, styles.py6, styles.pb12]}>
            <View style={[styles.wFull, styles.flexCol, { maxWidth: 1024 }]}>
                {/* Header */}
                <View style={[styles.wFull, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.relative, styles.mb6, { height: 48 }]}>
                    <Button variant="ghost" onPress={() => navigation.goBack()} style={[styles.absolute, { left: 0, zIndex: 10 }]}>
                        ← Back
                    </Button>
                    <Text style={[styles.textXl, styles.fontSerif, styles.textPrimary]}>
                        Vocabulary Details
                    </Text>
                </View>

                {/* Content */}
                <View style={[{ flexDirection: isMobile ? 'column' : 'row' }, styles.gap6, styles.alignStart]}>

                    {/* Left Column */}
                    <View style={[{ flex: isMobile ? 1 : 5 }, styles.flexCol, styles.gap6]}>
                        {/* Kanji & Reading Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <View style={[styles.flexCol, styles.gap6, !isMobile && styles.alignCenter]}>
                                <View style={[styles.flexCol, styles.alignCenter, styles.flex1]}>
                                    <View style={[styles.relative, styles.flexRow, styles.alignStart, styles.mb4]}>
                                        <Text style={[isMobile ? styles.text4xl : styles.text5xl, styles.fontMincho, styles.textPrimary]}>
                                            {vocab.writtenForm.kanji}
                                        </Text>
                                        {vocab.mergedVocabs && vocab.mergedVocabs.length > 1 && (
                                            <View style={[styles.absolute, { right: -40, top: 0 }]}>
                                            <Icon name="group" size={24} color={THEME.colors.tertiary + '66'} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                        <Text style={[styles.text3xl, styles.fontGothic, styles.textSecondary]}>
                                            {vocab.reading.primary}
                                        </Text>
                                        {vocab.reading.alternatives.length > 0 && (
                                            <Text style={[styles.textSm, styles.textTertiary, styles.fontGothic, styles.textCenter]}>
                                                Also: {vocab.reading.alternatives.join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                {progress && (
                                    <View style={[styles.flexRow, styles.justifyCenter, styles.gap8, styles.pt6, styles.border, { borderTopWidth: 1, borderColor: THEME.colors.divider, width: '100%' }]}>
                                        <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                            <MasteryRing memoryStrength={progress.reading.memoryStrength} size={60} variant="reading" />
                                            <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.fontSemiBold, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                Reading
                                            </Text>
                                        </View>
                                        <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                            <MasteryRing memoryStrength={progress.meaning.memoryStrength} size={60} variant="meaning" />
                                            <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.fontSemiBold, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                Meaning
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Card>

                        {/* Metadata Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary, styles.mb4]}>Information</Text>
                            <View style={[styles.flexRow, styles.flexWrap, styles.gap4]}>
                                <View style={{ minWidth: 120 }}>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                        Frequency
                                    </Text>
                                    <Text style={[styles.textBase, styles.textPrimary, styles.fontGothic]}>
                                        #{vocab.frequency.kanjiRank.toLocaleString()}
                                    </Text>
                                </View>
                                <View style={{ minWidth: 120 }}>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                        KKLC Step
                                    </Text>
                                    <Text style={[styles.textBase, styles.textPrimary, styles.fontGothic]}>
                                        Step {vocab.progression.kklcStep}
                                    </Text>
                                </View>
                                {vocab.usageHints?.examplePattern && (
                                    <View style={[styles.wFull, styles.pt2, styles.border, { borderTopWidth: 1, borderColor: THEME.colors.divider }]}>
                                        <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                            Usage Pattern
                                        </Text>
                                        <Text style={[styles.textBase, styles.textPrimary, styles.fontMincho]}>
                                            {vocab.usageHints.examplePattern}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Card>

                        {/* Merged Vocabs Details */}
                        {vocab.mergedVocabs && vocab.mergedVocabs.length > 1 && (
                            <Card size={isMobile ? "sm" : "md"}>
                                <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb4]}>
                                    <Icon name="group" size={18} color={THEME.colors.primary} />
                                    <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary]}>
                                        Original Entries
                                    </Text>
                                </View>
                                <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif, styles.mb4]}>
                                    This is a merged entry combining multiple JMDict words that share the exact same kanji.
                                </Text>
                                <View style={styles.gap4}>
                                    {vocab.mergedVocabs.map((mv, idx) => (
                                        <View key={idx} style={[styles.pl3, { borderLeftWidth: 2, borderColor: THEME.colors.divider }]}>
                                            <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb1]}>
                                                <Text style={[styles.fontGothic, styles.fontBold, styles.textPrimary]}>{mv.originalPrimaryReading}</Text>
                                                <Text style={[styles.textXs, styles.textTertiary]}>ID: {mv.id}</Text>
                                                {mv.isBase && (
                                                    <View style={[styles.px1_5, styles.py0_5, { backgroundColor: THEME.colors.accent + '1A', borderRadius: 4 }]}>
                                                        <Text style={[{ fontSize: 10 }, styles.textAccent, styles.fontGothic]}>BASE</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif]}>
                                                {mv.originalGlosses.join(', ')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        )}

                        {/* Progress Details */}
                        {progress && progress.introductionAt && (
                            <>
                                <Card size={isMobile ? "sm" : "md"}>
                                    <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary, styles.mb4]}>Stats</Text>
                                    <View style={[styles.flexCol, styles.gap4]}>
                                        <View style={[styles.flexRow, styles.gap4]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                    Reviews
                                                </Text>
                                                <Text style={[styles.textXl, styles.textPrimary, styles.fontGothic]}>
                                                    {progress.totalReviews}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                    Interval
                                                </Text>
                                                <Text style={[styles.textXl, styles.textPrimary, styles.fontGothic]}>
                                                    {progress.reading.interval.toFixed(1)}d
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.pt2, styles.border, styles.flexRow, styles.gap4, { borderTopWidth: 1, borderColor: THEME.colors.divider }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                    Introduced
                                                </Text>
                                                <Text style={[styles.textBase, styles.textPrimary, styles.fontGothic]}>
                                                    {new Date(progress.introductionAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb1, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                    Next Review
                                                </Text>
                                                <View style={styles.gap1}>
                                                    <View style={[styles.flexRow, styles.alignCenter, styles.gap2]}>
                                                        <Text style={[styles.textSm, styles.textSecondary, styles.fontGothic, { width: 64 }]}>Reading:</Text>
                                                        <Text style={[styles.textBase, styles.textPrimary, styles.fontGothic]}>
                                                            {progress.reading.dueDate ? new Date(progress.reading.dueDate).toLocaleDateString() : 'Ready'}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.flexRow, styles.alignCenter, styles.gap2]}>
                                                        <Text style={[styles.textSm, styles.textSecondary, styles.fontGothic, { width: 64 }]}>Meaning:</Text>
                                                        <Text style={[styles.textBase, styles.textPrimary, styles.fontGothic]}>
                                                            {progress.meaning.dueDate ? new Date(progress.meaning.dueDate).toLocaleDateString() : 'Ready'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.wFull}>
                                            <VocabHistoryGraph
                                                readingEntry={progress.reading}
                                                meaningEntry={progress.meaning}
                                                introDate={progress.introductionAt ? new Date(progress.introductionAt) : null}
                                            />
                                        </View>
                                    </View>
                                </Card>
                                <ReviewTimeline readingEntry={progress.reading} meaningEntry={progress.meaning} />
                            </>
                        )}
                        <VocabRelationshipsCard vocab={vocab} />
                    </View>

                    {/* Right Column */}
                    <View style={[{ flex: isMobile ? 1 : 7 }, styles.flexCol, styles.gap6]}>
                        {/* Meanings Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary, styles.mb4]}>Meanings</Text>
                            <View style={styles.gap6}>
                                {vocab.senses.map((sense, index) => (
                                    <View key={index} style={[styles.pb6, index < vocab.senses.length - 1 ? { borderBottomWidth: 1, borderColor: THEME.colors.divider } : {}]}>
                                        {/* POS Tags */}
                                        <View style={[styles.flexRow, styles.flexWrap, styles.gap2, styles.mb3]}>
                                            {Array.from(new Set([...sense.pos, ...sense.misc.rawTags])).map(tag => (
                                                <View
                                                    key={tag}
                                                    style={[styles.px2, styles.py1, { backgroundColor: THEME.colors.feedbackBackground, borderRadius: 4 }]}
                                                >
                                                    <Text style={[styles.textXs, styles.textSecondary, styles.fontGothic]}>
                                                        {TagsLookup[tag as Tags]}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                        {/* Glosses */}
                                        <Text style={[styles.textLg, styles.textSecondary, styles.fontSerif, { lineHeight: 28 }]}>
                                            {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                                <Text style={[styles.textSm, styles.textTertiary, styles.fontGothic, styles.mr2]}>
                                                    [{sense.appliesToReadings.join(', ')}]
                                                </Text>
                                            )}
                                            {sense.glosses.join(', ')}
                                        </Text>

                                        {/* Related Compounds (Specific to Sense) */}
                                        {sense.related?.compounds && sense.related.compounds.length > 0 && (
                                            <View style={[styles.mt4, styles.pt3, styles.border, { borderTopWidth: 1, borderColor: THEME.colors.divider + '80' }]}>
                                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.mb2, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                                                    Related
                                                </Text>
                                                <View style={[styles.flexRow, styles.flexWrap, styles.gap2]}>
                                                    {compoundList(sense.related.compounds)}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </Card>

                        {/* Sentences Card */}
                        <VocabSentencesCard vocabId={vocab.id} />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
