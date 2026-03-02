import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from "../../components/ui/Button";
import { useQuiz } from "../../context/useQuiz";
import { StatsOverview } from "./components/StatsOverview";
import { ReviewForecast } from "./components/ReviewForecast";
import { DailyProgressionChart } from "./components/DailyProgressionChart";
import { SmartVocabList } from "./components/SmartVocabList";
import { styles, THEME } from "@gokan-srs/ui";

export function StatsScreen({ onBack, onVocabClick }: { onBack: () => void; onVocabClick?: (vocabId: string) => void }) {
    const { state } = useQuiz();

    // Guard if accessible without progress (though route is protected usually)
    if (!state.progress) return null;

    return (
        <ScrollView style={[styles.flex1, styles.wFull, styles.bgBackground]} contentContainerStyle={[styles.alignCenter, styles.px4, styles.py6, styles.pb12]}>
            <View style={[styles.wFull, styles.flexCol, styles.gap6, { maxWidth: 896 }]}>
                {/* Header */}
                <View style={[styles.wFull, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.relative, { height: 48 }]}>
                    <Button variant="ghost" onPress={onBack} style={[styles.absolute, { left: 0, zIndex: 10 }]}>
                        ← Back
                    </Button>
                    <Text style={[styles.textXl, styles.fontSerif, styles.textPrimary]}>
                        Statistics
                    </Text>
                </View>

                <StatsOverview progress={state.progress} />

                <View style={[styles.wFull, styles.p6, styles.bgSurface, styles.border, styles.mb6, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                    <Text style={[styles.textLg, styles.mb4, styles.textPrimary, styles.fontSerif]}>Daily Progression</Text>
                    <DailyProgressionChart progress={state.progress} />
                </View>

                <View style={[styles.wFull, styles.p6, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                    <Text style={[styles.textLg, styles.mb4, styles.textPrimary, styles.fontSerif]}>Review Forecast</Text>
                    <ReviewForecast progress={state.progress} />
                </View>

                <View style={[styles.wFull]}>
                    <Text style={[styles.textLg, styles.mb4, styles.textPrimary, styles.fontSerif]}>Vocabulary</Text>
                    <SmartVocabList
                        progress={state.progress.learningQueue}
                        onVocabClick={onVocabClick}
                    />
                </View>
            </View>
        </ScrollView>
    );
}
