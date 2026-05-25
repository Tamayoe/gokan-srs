import { THEME, styles } from "@gokan-srs/ui";
import type { UserProgress } from "@gokan-srs/core/models/user.model";
import { useMemo } from "react";
import { View, Text } from "react-native";

interface DailyProgressionChartProps {
    progress: UserProgress;
}

export function DailyProgressionChart({ progress }: DailyProgressionChartProps) {
    const progression = useMemo(() => {
        const queue = progress.learningQueue || [];
        const daysToShow = 14;
        const now = new Date();
        const buckets: { label: string, correct: number, incorrect: number, date: Date, empty: boolean }[] = [];

        // Initialize buckets
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const label = i === 0 ? 'Today' : (i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short' }));
            buckets.push({ label, correct: 0, incorrect: 0, date: d, empty: true });
        }

        // Aggregate history
        queue.forEach(v => {
            const allHistory = [
                ...(v.reading?.history || []),
                ...(v.meaning?.history || [])
            ];

            allHistory.forEach(log => {
                if (log.result === 'pass') return;

                const logDate = new Date(log.date);
                logDate.setHours(0, 0, 0, 0);

                const bucket = buckets.find(b => b.date.getTime() === logDate.getTime());
                if (bucket) {
                    bucket.empty = false;
                    if (log.result === 'correct' || log.result === 'minor_error') {
                        bucket.correct++;
                    } else if (log.result === 'wrong') {
                        bucket.incorrect++;
                    }
                }
            });
        });

        // Calculate max for expected height scaling
        const maxCount = Math.max(10, ...buckets.map(b => b.correct + b.incorrect));

        return { buckets, maxCount };
    }, [progress]);

    return (
        <View style={[styles.wFull, styles.flexRow, styles.justifyBetween, styles.alignEnd, { height: 200, paddingVertical: 16, position: 'relative' }]}>
            {/* Background Grid */}
            <View pointerEvents="none" style={[styles.absolute, styles.wFull, styles.hFull, styles.flexCol, styles.justifyBetween, { top: 0, left: 0, paddingVertical: 16, paddingLeft: 16, zIndex: 0 }]}>
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.dividerFaint }]} />
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.dividerFaint }]} />
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.dividerFaint }]} />
            </View>

            {progression.buckets.map((bucket, i) => {
                const correctHeight = (bucket.correct / progression.maxCount) * 100;
                const incorrectHeight = (bucket.incorrect / progression.maxCount) * 100;
                const isWeekend = bucket.date.getDay() === 0 || bucket.date.getDay() === 6;

                return (
                    <View key={i} style={[styles.flexCol, styles.alignCenter, styles.justifyEnd, { flex: 1, minWidth: 0, height: '100%', zIndex: 10 }]}>
                        <View style={[styles.relative, styles.flexCol, styles.justifyEnd, styles.alignCenter, { flex: 1, width: '100%', marginBottom: 8, maxWidth: 28 }]}>
                            {/* Stacked Bars Container */}
                            <View style={[styles.wFull, styles.flexCol, styles.alignCenter, styles.justifyEnd, { height: '100%', position: 'relative', flexDirection: 'column-reverse' }]}>
                                {/* Correct Bar (Bottom) */}
                                <View
                                    style={{
                                        width: '100%',
                                        height: `${correctHeight}%`,
                                        backgroundColor: THEME.colors.secondary,
                                        borderBottomLeftRadius: 2,
                                        borderBottomRightRadius: 2,
                                        borderTopLeftRadius: bucket.incorrect === 0 ? 2 : 0,
                                        borderTopRightRadius: bucket.incorrect === 0 ? 2 : 0,
                                    }}
                                />

                                {/* Incorrect Bar (Top) */}
                                <View
                                    style={{
                                        width: '100%',
                                        height: `${incorrectHeight}%`,
                                        backgroundColor: THEME.colors.error,
                                        borderTopLeftRadius: 2,
                                        borderTopRightRadius: 2,
                                        borderBottomLeftRadius: bucket.correct === 0 ? 2 : 0,
                                        borderBottomRightRadius: bucket.correct === 0 ? 2 : 0,
                                    }}
                                />
                            </View>
                        </View>

                        <Text numberOfLines={1} style={[styles.textCenter, styles.wFull, styles.fontMedium, { fontSize: 10, marginTop: 8, paddingHorizontal: 2, opacity: isWeekend ? 0.7 : 1, color: THEME.colors.primary }]}>
                            {bucket.label.substring(0, 3)}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
