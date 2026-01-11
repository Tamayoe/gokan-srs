import React from "react";
import type {UserProgress} from "../models/user.model";
import {THEME} from "../commons/theme";
import {Stat} from "./Stat";

export const ProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
    const now = new Date();

    const dueNow = progress.learningQueue.filter(
        v => v.stage === 'learning' &&
            v.nextReviewAt &&
            v.nextReviewAt <= now
    ).length;

    return (
        <div
            className="border rounded p-5 mb-8 w-full max-w-2xl"
            style={{
                backgroundColor: THEME.colors.surface,
                borderColor: THEME.colors.divider,
            }}
        >
            <div className="grid grid-cols-3 text-center gap-6">
                <Stat
                    value={dueNow}
                    label="Due now"
                    color={THEME.colors.accent}
                />
                <Stat
                    value={progress.learningQueue.length}
                    label="Learning"
                    color={THEME.colors.primary}
                />
                <Stat
                    value={progress.stats.totalLearned}
                    label="Mastered"
                    color={THEME.colors.secondary}
                />
            </div>
        </div>
    );
};