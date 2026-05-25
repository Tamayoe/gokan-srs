import { useEffect, useState } from 'react';
import { useAppNavigation } from '../../context/NavigationContext';
import { View, Text } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import type { Sentence } from '@gokan-srs/core/models/sentence.model';
import { InteractiveSentence } from '../../components/InteractiveSentence';
import { styles, THEME } from '@gokan-srs/ui';

interface VocabSentencesCardProps {
    vocabId: string;
}

export function VocabSentencesCard({ vocabId }: VocabSentencesCardProps) {
    const navigation = useAppNavigation();
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setIsExpanded(false); // Reset expansion state on vocab change
        VocabularyService.loadSentences(vocabId).then(data => {
            if (mounted && data) {
                setSentences(data);
            }
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [vocabId]);

    if (loading || sentences.length === 0) {
        return null;
    }

    const INITIAL_COUNT = 5;
    const isExpandable = sentences.length > INITIAL_COUNT;
    const displayedSentences = isExpanded ? sentences : sentences.slice(0, INITIAL_COUNT);

    return (
        <Card>
            <View style={[styles.flexRow, styles.alignCenter, styles.mb4]}>
                <Text style={[styles.textLg, styles.fontGothic, styles.fontSemiBold, styles.textPrimary]}>
                    Example Sentences
                </Text>
                <Text style={[styles.textSm, styles.fontNormal, styles.textTertiary, styles.ml2]}>
                    ({sentences.length})
                </Text>
            </View>
            <View style={styles.wFull}>
                {displayedSentences.map((sentence, index) => (
                    <View key={sentence.id} style={[
                        styles.pb4,
                        index < displayedSentences.length - 1 ? { borderBottomWidth: 1, borderBottomColor: THEME.colors.divider, marginBottom: 16 } : {}
                    ]}>
                        <View style={[styles.mb1]}>
                            <InteractiveSentence
                                sentence={sentence}
                                targetVocabId={vocabId}
                                onVocabClick={(vid) => navigation.navigate(`/vocab/${vid}`)}
                                showFurigana={true}
                                textStyle={{ fontSize: 20 }}
                            />
                        </View>
                        {sentence.en && sentence.en.length > 0 && (
                            <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif, styles.mt2]}>
                                {sentence.en[0].text}
                            </Text>
                        )}
                    </View>
                ))}

                {isExpandable && (
                    <View style={[styles.mt4, styles.flexRow, styles.justifyCenter]}>
                        <Button
                            variant="secondary"
                            onPress={() => setIsExpanded(!isExpanded)}
                            style={{ borderColor: THEME.colors.accentLight, width: '100%', maxWidth: 200 }}
                            textStyle={[styles.textAccent, styles.fontGothic, styles.textSm]}
                        >
                            {isExpanded ? 'Show less' : `Show all ${sentences.length} sentences`}
                        </Button>
                    </View>
                )}
            </View>
        </Card>
    );
}
