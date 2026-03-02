import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styles, THEME } from '@gokan-srs/ui';
import type { SRSEntry, ReviewLog } from '@gokan-srs/core/models/vocabulary.model';
import { Card } from './ui/Card';

interface ReviewTimelineProps {
    readingEntry: SRSEntry;
    meaningEntry: SRSEntry;
}

interface TimelineEvent extends ReviewLog {
    type: 'reading' | 'meaning';
}

export function ReviewTimeline({ readingEntry, meaningEntry }: ReviewTimelineProps) {
    const events = useMemo(() => {
        const rEvents: TimelineEvent[] = readingEntry.history.map(h => ({ ...h, type: 'reading' }));
        const mEvents: TimelineEvent[] = meaningEntry.history.map(h => ({ ...h, type: 'meaning' }));
        return [...rEvents, ...mEvents].sort((a, b) => b.date - a.date);
    }, [readingEntry, meaningEntry]);

    if (events.length === 0) {
        return null;
    }

    const formatResult = (result: string) => {
        switch (result) {
            case 'correct': return <Text style={[styles.textPrimary, styles.fontMedium]}>Correct</Text>;
            case 'minor_error': return <Text style={[styles.textPrimary, { opacity: 0.8 }]}>Minor Error</Text>;
            case 'wrong': return <Text style={[styles.textError, styles.fontMedium]}>Incorrect</Text>;
            case 'pass': return <Text style={[styles.textSecondary]}>Passed</Text>;
            default: return <Text style={[styles.textSecondary]}>{result}</Text>;
        }
    };

    return (
        <Card size="md">
            <Text style={[styles.textLg, styles.fontGothic, styles.fontSemibold, styles.textPrimary, styles.mb4]}>Review History</Text>
            <ScrollView style={[styles.relative, styles.borderLeft, styles.ml3, styles.pr4, { borderColor: THEME.colors.divider, maxHeight: 384 }]}>
                {events.map((event, i) => (
                    <View key={`${event.date}-${event.type}-${i}`} style={[styles.relative, styles.pl4, styles.mb6]}>
                        <View style={[styles.absolute, { left: -5, top: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: event.result === 'wrong' ? THEME.colors.error : THEME.colors.divider }]} />

                        <View style={[styles.flexRow, styles.justifyBetween, styles.alignCenter]}>
                            <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb1]}>
                                <Text style={[styles.textSm, styles.fontGothic, styles.fontMedium, styles.textPrimary, { textTransform: 'capitalize' }]}>{event.type}</Text>
                                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, styles.px1, styles.py1, styles.rounded, styles.bgFeedback]}>
                                    {event.interval.toFixed(1)}d interval
                                </Text>
                            </View>
                            <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic]}>
                                {new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </Text>
                        </View>
                        <View style={[styles.mt1, styles.flexRow, styles.alignCenter, styles.gap2]}>
                            {formatResult(event.result)}
                            {event.latency > 0 && (
                                <Text style={[styles.textTertiary, styles.textXs, styles.fontGothic]}>· {(event.latency / 1000).toFixed(1)}s</Text>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </Card>
    );
}
