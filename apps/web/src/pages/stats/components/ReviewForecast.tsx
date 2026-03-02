import { THEME, styles } from "@gokan-srs/ui";
import type { UserProgress } from "@gokan-srs/core/models/user.model";
import { useMemo } from "react";
import { View, Text } from "react-native";

interface ReviewForecastProps {
    progress: UserProgress;
}

export function ReviewForecast({ progress }: ReviewForecastProps) {
    const forecast = useMemo(() => {
        const queue = progress.learningQueue || [];
        const daysToShow = 7;
        const now = new Date();
        const buckets: { label: string, readingCount: number, meaningCount: number, date: Date }[] = [];

        // Initialize buckets: 0 = Due Now, 1 = Later Today, 2 = Tomorrow, ... 7 = Day 6
        buckets.push({ label: 'Now', readingCount: 0, meaningCount: 0, date: now });
        buckets.push({ label: 'Later', readingCount: 0, meaningCount: 0, date: now });

        for (let i = 1; i < daysToShow; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            d.setHours(0, 0, 0, 0); // Normalize to midnight

            const label = i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
            buckets.push({ label, readingCount: 0, meaningCount: 0, date: d });
        }

        // Aggregate
        queue.forEach(v => {
            // Helper to place item in bucket
            const placeInBucket = (dueDate: Date, isReading: boolean) => {
                if (dueDate <= now) {
                    // Due Now -> Bucket 0
                    if (isReading) buckets[0].readingCount++;
                    else buckets[0].meaningCount++;
                } else {
                    const dueDay = new Date(dueDate);
                    dueDay.setHours(0, 0, 0, 0);

                    const nowDay = new Date(now);
                    nowDay.setHours(0, 0, 0, 0);

                    if (dueDay.getTime() === nowDay.getTime()) {
                        // Later Today -> Bucket 1
                        if (isReading) buckets[1].readingCount++;
                        else buckets[1].meaningCount++;
                    } else {
                        // Future Day -> Find matching bucket
                        const bucket = buckets.find(b => b.date.getTime() === dueDay.getTime() && b.label !== 'Now' && b.label !== 'Later');
                        if (bucket) {
                            if (isReading) bucket.readingCount++;
                            else bucket.meaningCount++;
                        }
                    }
                }
            };

            // [BUGFIX] Ignore items that are already graduated, in case they have a legacy buggy dueDate
            if (v.stage !== 'graduated') {
                if (v.reading.dueDate) placeInBucket(new Date(v.reading.dueDate), true);
                if (v.meaning.dueDate) placeInBucket(new Date(v.meaning.dueDate), false);
            }
        });

        const maxCount = Math.max(10, ...buckets.map(b => b.readingCount + b.meaningCount));

        return { buckets, maxCount };
    }, [progress]);

    return (
        <View style={[styles.wFull, styles.flexRow, styles.justifyBetween, styles.alignEnd, styles.gap2, styles.py4, styles.relative, { height: 200 }]}>
            {/* Background Grid */}
            <View style={[styles.absolute, styles.wFull, styles.hFull, styles.flexCol, styles.justifyBetween, styles.py4, styles.pl4, { top: 0, bottom: 0, left: 0, right: 0, zIndex: 0 }]} pointerEvents="none">
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.divider + '80' }]} />
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.divider + '80' }]} />
                <View style={[styles.wFull, { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: THEME.colors.divider + '80' }]} />
            </View>

            {forecast.buckets.map((bucket, i) => {
                const total = bucket.readingCount + bucket.meaningCount;
                const readingHeight = (bucket.readingCount / forecast.maxCount) * 100;
                const meaningHeight = (bucket.meaningCount / forecast.maxCount) * 100;

                return (
                    <View key={i} style={[styles.flexCol, styles.alignCenter, styles.flex1, styles.hFull, styles.justifyEnd, { zIndex: 10 }]}>
                        <View style={[styles.relative, styles.wFull, styles.flexCol, styles.justifyEnd, styles.alignCenter, styles.flex1, styles.mb2, { maxWidth: 28 }]}>
                            {/* Stacked Bars Container */}
                            <View style={[styles.wFull, { flexDirection: 'column-reverse' }, styles.alignCenter, styles.justifyEnd, styles.hFull]}>

                                {/* Reading Bar (Bottom) */}
                                <View
                                    style={[
                                        styles.wFull,
                                        styles.relative,
                                        {
                                            height: `${readingHeight}%`,
                                            backgroundColor: THEME.mastery.reading.loop1,
                                            borderBottomLeftRadius: 2,
                                            borderBottomRightRadius: 2,
                                            ...(bucket.meaningCount === 0 ? { borderTopLeftRadius: 2, borderTopRightRadius: 2 } : {})
                                        }
                                    ]}
                                />

                                {/* Meaning Bar (Top) */}
                                <View
                                    style={[
                                        styles.wFull,
                                        styles.relative,
                                        {
                                            height: `${meaningHeight}%`,
                                            backgroundColor: THEME.mastery.meaning.loop1,
                                            borderTopLeftRadius: 2,
                                            borderTopRightRadius: 2,
                                            ...(bucket.readingCount === 0 ? { borderBottomLeftRadius: 2, borderBottomRightRadius: 2 } : {})
                                        }
                                    ]}
                                />
                            </View>

                            {/* Total Label (Top) - In RN we simulate hover by just showing it, or omitting hover logic for mobile */}
                            <Text style={[styles.textXs, styles.fontBold, styles.mb1, styles.absolute, styles.textSecondary, { top: -24 }]}>
                                {total > 0 ? total : ''}
                            </Text>
                        </View>

                        <Text style={[styles.textXs, styles.textSecondary, styles.fontMedium, styles.mt2]}>
                            {bucket.label}
                        </Text>

                        {/* Legend/Total Text at bottom */}
                        <View style={[styles.flexCol, styles.alignCenter, styles.mt1]}>
                            <Text style={[{ fontSize: 10 }, styles.textTertiary]}>
                                {i === 0 && total > 0 ? '(Due)' : total > 0 ? total : '-'}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
