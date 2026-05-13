import { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import type { SRSEntry, ReviewLog } from "@gokan-srs/core/models/vocabulary.model";
import { THEME, styles } from "@gokan-srs/ui";

interface VocabHistoryGraphProps {
    readingEntry: SRSEntry;
    meaningEntry: SRSEntry;
    introDate?: Date | null;
}

export function VocabHistoryGraph({ readingEntry, meaningEntry, introDate }: VocabHistoryGraphProps) {
    const data = useMemo(() => {
        const points: { date: number; type: 'reading' | 'meaning'; strength: number }[] = [];
        if (introDate) {
            points.push({ date: new Date(introDate).getTime(), type: 'reading', strength: 0 });
            points.push({ date: new Date(introDate).getTime(), type: 'meaning', strength: 0 });
        }
        readingEntry.history.forEach((h: ReviewLog) => {
            points.push({ date: new Date(h.date).getTime(), type: 'reading', strength: h.interval });
        });
        meaningEntry.history.forEach((h: ReviewLog) => {
            points.push({ date: new Date(h.date).getTime(), type: 'meaning', strength: h.interval });
        });
        const now = Date.now();
        points.push({ date: now, type: 'reading', strength: readingEntry.interval });
        points.push({ date: now, type: 'meaning', strength: meaningEntry.interval });
        points.sort((a, b) => a.date - b.date);
        return points;
    }, [readingEntry, meaningEntry, introDate]);

    if (data.length <= 4) return null;

    const minDate = data[0].date;
    const maxDate = data[data.length - 1].date;
    const timeSpan = maxDate - minDate || 1;

    const maxStrength = 365;
    const actualMaxStrength = Math.max(...data.map(d => d.strength), 3);
    const yMax = Math.min(Math.max(actualMaxStrength * 1.2, 3), maxStrength * 1.1);

    const generatePath = (type: 'reading' | 'meaning') => {
        const typePoints = data.filter(d => d.type === type);
        if (typePoints.length === 0) return "";
        return typePoints.map((p, i) => {
            const x = ((p.date - minDate) / timeSpan) * 100;
            const y = 100 - ((p.strength / yMax) * 100);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(" ");
    };

    const readingPath = generatePath('reading');
    const meaningPath = generatePath('meaning');

    const readingColor = THEME.mastery.reading.loop1;
    const meaningColor = THEME.mastery.meaning.loop1;

    return (
        <View style={[styles.wFull, styles.flexCol, styles.pt4, styles.borderTop, styles.mt6]}>
            <View style={[styles.flexRow, styles.justifyBetween, styles.alignCenter, styles.mb4]}>
                <Text style={[styles.textXs, styles.textTertiary, styles.fontGothic, { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }]}>
                    Learning Curve
                </Text>
                <View style={[styles.flexRow, styles.gap4]}>
                    <View style={[styles.flexRow, styles.alignCenter, styles.gap1]}>
                        <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: readingColor }]} />
                        <Text style={[styles.textXs, styles.fontGothic, styles.textSecondary]}>Reading</Text>
                    </View>
                    <View style={[styles.flexRow, styles.alignCenter, styles.gap1]}>
                        <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: meaningColor }]} />
                        <Text style={[styles.textXs, styles.fontGothic, styles.textSecondary]}>Meaning</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.wFull, { height: 128, position: 'relative' }]}>
                <Svg style={[{ width: '100%', height: '100%' }]} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <Line x1="0" y1="0" x2="100" y2="0" stroke={THEME.colors.divider} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
                    <Line x1="0" y1="50" x2="100" y2="50" stroke={THEME.colors.divider} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
                    <Line x1="0" y1="100" x2="100" y2="100" stroke={THEME.colors.divider} strokeWidth="0.5" opacity="0.5" />

                    {yMax >= maxStrength && (
                        <Line x1="0" y1={100 - ((maxStrength / yMax) * 100)} x2="100" y2={100 - ((maxStrength / yMax) * 100)} stroke="#22c55e" strokeWidth="0.5" opacity="0.2" />
                    )}

                    {readingPath.length > 0 && (
                        <Path
                            d={readingPath}
                            fill="none"
                            stroke={readingColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.8"
                        />
                    )}

                    {meaningPath.length > 0 && (
                        <Path
                            d={meaningPath}
                            fill="none"
                            stroke={meaningColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.8"
                        />
                    )}
                </Svg>
            </View>
        </View>
    );
}
