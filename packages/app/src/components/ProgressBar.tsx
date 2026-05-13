import React from "react";
import type { UserProgress } from "@gokan-srs/core/models/user.model";
import { View } from "react-native";
import { styles, THEME } from "@gokan-srs/ui";

import { Stat } from "./Stat";

export const ProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
    const now = new Date();

    const dueNow = progress.learningQueue.filter(
        v => v.stage === 'learning' &&
            v.nextReviewAt &&
            v.nextReviewAt <= now
    ).length;

    return (
        <View style={[styles.border, styles.roundedMd, styles.bgSurface, styles.p4, styles.mb8, styles.wFull, { maxWidth: 672 }]}>
            <View style={[styles.flexRow, styles.justifyBetween, styles.gap6]}>
                <View style={[styles.flex1, styles.alignCenter]}>
                    <Stat
                        value={dueNow}
                        label="Due now"
                        color={THEME.colors.accent}
                    />
                </View>
                <View style={[styles.flex1, styles.alignCenter]}>
                    <Stat
                        value={progress.learningQueue.length}
                        label="Learning"
                        color={THEME.colors.primary}
                    />
                </View>
                <View style={[styles.flex1, styles.alignCenter]}>
                    <Stat
                        value={progress.stats.totalLearned}
                        label="Mastered"
                        color={THEME.colors.secondary}
                    />
                </View>
            </View>
        </View>
    );
};