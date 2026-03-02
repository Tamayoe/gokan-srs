import type { UserProgress } from "@gokan-srs/core/models/user.model";
import { useMemo, useState, useEffect } from "react";
import type { ReviewLog } from "@gokan-srs/core/models/vocabulary.model";
import { View, Text } from "react-native";
import { styles, THEME } from "@gokan-srs/ui";

interface StatsOverviewProps {
    progress: UserProgress;
}

export function StatsOverview({ progress }: StatsOverviewProps) {
    const [kanjiCoverage, setKanjiCoverage] = useState<{ covered: number, total: number } | null>(null);

    const stats = useMemo(() => {
        const queue = progress.learningQueue || [];

        // Volume
        const totalLearned = queue.length;
        const graduated = queue.filter(v => v.stage === 'graduated').length;
        const learning = queue.filter(v => v.stage === 'learning').length;

        // Reviews & Winrate
        let totalCorrect = 0;
        let totalAnswers = 0;

        queue.forEach(v => {
            const allHistory: ReviewLog[] = [
                ...(v.reading?.history || []),
                ...(v.meaning?.history || [])
            ];

            allHistory.forEach(r => {
                if (r.result === 'pass') return;

                totalAnswers++;
                if (r.result === 'correct' || r.result === 'minor_error') {
                    totalCorrect++;
                }
            });
        });

        const winrate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

        return {
            totalLearned,
            graduated,
            learning,
            totalAnswers,
            winrate
        };
    }, [progress]);

    useEffect(() => {
        let mounted = true;
        // Load frequency index to get kanji for each vocab
        import('../../../services/vocabulary.service').then(({ VocabularyService }) => {
            VocabularyService.loadFrequencyIndex().then(idx => {
                if (!idx || !mounted) return;

                const learnedVocabIds = new Set((progress.learningQueue || []).map(v => v.vocabId));

                const uniqueKanji = new Set<string>();
                idx.forEach(entry => {
                    if (learnedVocabIds.has(entry.id)) {
                        entry.containedKanji.forEach(k => uniqueKanji.add(k));
                    }
                });

                let coveredCount = 0;
                const totalKnown = progress.kanjiKnowledge?.kanjiSet?.size || 0;

                if (progress.kanjiKnowledge?.kanjiSet) {
                    progress.kanjiKnowledge.kanjiSet.forEach(k => {
                        if (uniqueKanji.has(k)) {
                            coveredCount++;
                        }
                    });
                }

                setKanjiCoverage({ covered: coveredCount, total: totalKnown });
            });
        });

        return () => { mounted = false; };
    }, [progress]);

    return (
        <View style={[styles.wFull, styles.flexRow, styles.flexWrap, styles.gap4]}>
            <StatCard title="Global Win Rate" value={`${stats.winrate}%`} subtitle={`${stats.totalAnswers} reviews`} />
            <StatCard
                title="Kanji Coverage"
                value={kanjiCoverage ? `${kanjiCoverage.covered}/${kanjiCoverage.total}` : "..."}
                subtitle={kanjiCoverage && kanjiCoverage.total > 0 ? `${Math.round((kanjiCoverage.covered / kanjiCoverage.total) * 100)}% of known kanji` : "Coverage"}
            />
            <StatCard title="Total Vocab" value={stats.totalLearned} subtitle="Introduced" />
            <StatCard title="Learning" value={stats.learning} subtitle="In progress" />
            <StatCard title="Graduated" value={stats.graduated} subtitle="Mastered" />
        </View>
    );
}

function StatCard({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) {
    const stringValue = String(value);
    const valueSizeClass = stringValue.length > 5 ? "text-2xl" : "text-3xl";

    return (
        <View style={[styles.flex1, styles.p4, styles.bgSurface, styles.border, styles.flexCol, styles.alignCenter, styles.justifyCenter, { borderRadius: 12, minWidth: 150, height: 112, borderColor: THEME.colors.divider }]}>
            <Text style={[styles.textSm, styles.textSecondary, styles.fontMedium, styles.mb1]}>{title}</Text>
            <Text style={[styles.text3xl, styles.fontBold, styles.textPrimary]}>{value}</Text>
            {subtitle && <Text style={[styles.textXs, styles.textTertiary, styles.mt1]}>{subtitle}</Text>}
        </View>
    );
}
