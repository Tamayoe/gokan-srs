import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useQuiz } from '../context/useQuiz';
import { useResponsive } from '../context/Responsive/useResponsive';
import { CONSTANTS } from '@gokan-srs/core/commons/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles, THEME } from '@gokan-srs/ui';
import { useNavigate } from 'react-router-dom';

export const SessionProgress: React.FC = () => {
    const { state, sessionState } = useQuiz();
    const { isMobile } = useResponsive();

    const stats = useMemo(() => {
        if (!state.progress) return { done: 0, remaining: 0, total: 0 };
        const now = new Date();
        const done = state.sessionHistory.filter(h => h.result !== 'wrong').length;
        const dueReviews = state.progress.learningQueue.filter(
            v => v.nextReviewAt && v.nextReviewAt <= now
        ).length;
        const dailyLeft = Math.max(0, CONSTANTS.srs.dailyNewLimit - state.progress.stats.newLearnedToday);
        let remaining = dueReviews;
        if (sessionState === 'learn' || dueReviews === 0) {
            remaining += dailyLeft;
        }
        return { done, remaining, total: done + remaining };
    }, [state.progress, state.sessionHistory, sessionState]);

    const progressPercent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

    return (
        <View style={[styles.wFull, styles.mxAuto, styles.mb6, { maxWidth: 896 }]}>
            {!isMobile && (
                <View style={[styles.flexCol, styles.gap4]}>
                    <View style={[styles.flexCol, styles.gap2]}>
                        <View style={[styles.flexRow, styles.justifyBetween, styles.alignEnd, styles.mb1]}>
                            <Text style={[styles.textSm, styles.fontMedium, { color: '#94a3b8' }]}>Session Progress</Text>
                            <Text style={[styles.textSm, styles.fontMedium, { color: '#94a3b8' }]}>
                                {stats.done} / {stats.total}
                            </Text>
                        </View>
                        <View style={[{ height: 8, backgroundColor: 'rgba(226, 232, 240, 0.5)', borderRadius: 9999, overflow: 'hidden' }, styles.flexRow]}>
                            <View style={[{ height: '100%', backgroundColor: THEME.colors.primary, width: `${progressPercent}%` }]} />
                        </View>
                    </View>
                    <HistoryTicker />
                </View>
            )}
            {isMobile && (
                <View style={styles.flexCol}>
                    <View style={[styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.px1]}>
                        <Text style={[styles.textXs, styles.fontMedium, { color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }]}>Session Progress</Text>
                        <Text style={[styles.textSm, styles.fontBold, { color: THEME.colors.primary }]}>
                            {stats.done} <Text style={{ color: '#94a3b8', fontWeight: '400' }}>/ {stats.total}</Text>
                        </Text>
                    </View>
                    <View style={[{ height: 4, width: '100%', backgroundColor: '#e2e8f0', marginTop: 8, borderRadius: 9999, overflow: 'hidden' }]}>
                        <View style={[{ height: '100%', backgroundColor: THEME.colors.primary, width: `${progressPercent}%` }]} />
                    </View>
                </View>
            )}
        </View>
    );
};

const HistoryTicker: React.FC = () => {
    const { state } = useQuiz();
    const navigate = useNavigate();
    const history = state.sessionHistory;
    const recentItems = history.slice(0, 5);

    return (
        <View style={[styles.flex1, styles.flexRow, styles.alignCenter, styles.gap3, { overflow: 'hidden', height: 32 }]}>
            {recentItems.map((item, index) => (
                <View key={`${item.vocabId}-${index}`} style={[styles.flexRow, styles.alignCenter, styles.gap2]}>
                    <Text 
                        onPress={() => navigate(`/vocab/${item.vocabId}`)}
                        style={[styles.fontSerif, styles.textSm, { color: item.result === 'correct' ? '#059669' : item.result === 'minor_error' ? '#d97706' : '#dc2626' }]}
                    >
                        {item.writtenForm}
                    </Text>

                    {item.result === 'correct' && <MaterialCommunityIcons name="check-circle" size={12} color="#10b981" />}
                    {item.result === 'minor_error' && <MaterialCommunityIcons name="alert-circle" size={12} color="#f59e0b" />}
                    {item.result === 'wrong' && <MaterialCommunityIcons name="close-circle" size={12} color="#ef4444" />}

                    <Text style={[styles.textXs, { color: '#94a3b8' }]}>
                        {item.delta > 0 ? '+' : ''}{Math.round(item.delta)}%
                    </Text>

                    {index < recentItems.length - 1 && (
                        <Text style={[styles.textBase, styles.mx1, { color: '#cbd5e1' }]}>•</Text>
                    )}
                </View>
            ))}

            {history.length === 0 && (
                <Text style={[styles.textSm, { color: '#94a3b8', fontStyle: 'italic' }]}>Session started...</Text>
            )}
        </View>
    );
};
