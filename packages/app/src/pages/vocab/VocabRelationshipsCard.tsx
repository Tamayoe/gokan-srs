import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { useAppNavigation } from "../../context/NavigationContext";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { styles, THEME } from "@gokan-srs/ui";

interface Props {
    vocab: Vocabulary;
}

export function VocabRelationshipsCard({ vocab }: Props) {
    const { isMobile } = useResponsive();
    const navigation = useAppNavigation();

    const [parents, setParents] = useState<Vocabulary[]>([]);
    const [components, setComponents] = useState<Vocabulary[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter IDs
    const componentIds = vocab.components || [];
    const parentIds = vocab.parents || [];

    const INITIAL_COUNT = 5;
    const isExpandable = componentIds.length > INITIAL_COUNT || parentIds.length > INITIAL_COUNT;

    const displayedComponentIds = isExpanded ? componentIds : componentIds.slice(0, INITIAL_COUNT);
    const displayedParentIds = isExpanded ? parentIds : parentIds.slice(0, INITIAL_COUNT);

    // Reset expansion state when navigating to a new vocabulary
    useEffect(() => {
        setIsExpanded(false);
    }, [vocab.id]);

    useEffect(() => {
        const load = async () => {
            if (displayedParentIds.length > 0) {
                const p = await Promise.all(displayedParentIds.map(id => VocabularyService.loadVocab(id).catch(() => null)));
                setParents(p.filter(v => v !== null) as Vocabulary[]);
            } else {
                setParents([]);
            }

            if (displayedComponentIds.length > 0) {
                const c = await Promise.all(displayedComponentIds.map(id => VocabularyService.loadVocab(id).catch(() => null)));
                setComponents(c.filter(v => v !== null) as Vocabulary[]);
            } else {
                setComponents([]);
            }
        };
        load();
    }, [isExpanded, vocab]); // Re-load when expanding

    if (componentIds.length === 0 && parentIds.length === 0) {
        return null;
    }

    const renderVocabList = (vocabs: Vocabulary[]) => {
        return (
            <View style={[{ gap: 12, marginTop: 8 }]}>
                {vocabs.map((v) => (
                    <Pressable
                        key={v.id}
                        onPress={() => navigation.navigate(`/vocab/${v.id}`)}
                        style={({ pressed, hovered }: any) => [
                            {
                                borderLeftWidth: 2,
                                borderLeftColor: pressed || hovered ? THEME.colors.accent : THEME.colors.divider,
                                paddingLeft: 12,
                                paddingVertical: 4,
                            }
                        ]}
                    >
                        {({ pressed, hovered }: any) => (
                            <View>
                                <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb1]}>
                                    <Text style={[
                                        styles.fontMincho,
                                        styles.textLg,
                                        pressed || hovered ? styles.textAccent : styles.textPrimary
                                    ]}>
                                        {v.writtenForm.kanji}
                                    </Text>
                                    <Text style={[styles.fontGothic, styles.fontBold, styles.textSecondary]}>
                                        {v.reading.primary}
                                    </Text>
                                    <Text style={[styles.textXs, styles.textTertiary, { marginLeft: 'auto' }]}>
                                        ID: {v.id}
                                    </Text>
                                </View>
                                <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif]} numberOfLines={2}>
                                    {v.senses && v.senses[0] ? v.senses[0].glosses.join(', ') : 'No definition available'}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                ))}
            </View>
        );
    };

    return (
        <Card size={isMobile ? "sm" : "md"}>
            <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary, styles.mb4]}>
                Relationships
            </Text>
            <View style={[{ gap: 24 }]}>
                {componentIds.length > 0 && (
                    <View>
                        <View style={[styles.mb2]}>
                            <Text style={[styles.textXs, styles.textTertiary, { textTransform: 'uppercase', letterSpacing: 0.5 }, styles.fontGothic]}>
                                Consists of ({componentIds.length})
                            </Text>
                        </View>
                        {renderVocabList(components)}
                    </View>
                )}

                {parentIds.length > 0 && (
                    <View style={componentIds.length > 0 ? [styles.pt4, styles.borderTop] : []}>
                        <View style={[styles.mb2]}>
                            <Text style={[styles.textXs, styles.textTertiary, { textTransform: 'uppercase', letterSpacing: 0.5 }, styles.fontGothic]}>
                                Used in Derived Words ({parentIds.length})
                            </Text>
                        </View>
                        {renderVocabList(parents)}
                    </View>
                )}
            </View>

            {isExpandable && (
                <View style={[styles.mt6, styles.flexRow, styles.justifyCenter]}>
                    <Button
                        variant="secondary"
                        onPress={() => setIsExpanded(!isExpanded)}
                        style={{ borderColor: THEME.colors.accentLight, width: '100%', maxWidth: 220 }}
                        textStyle={[styles.textAccent, styles.fontGothic, styles.textSm]}
                    >
                        {isExpanded ? "Show fewer relationships" : "Show all relationships"}
                    </Button>
                </View>
            )}
        </Card>
    );
}
