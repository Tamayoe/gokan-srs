import React from "react";
import type { UserProgress } from "../models/user.model";

import { Stat } from "./Stat";

export const ProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
    const now = new Date();

    const dueNow = progress.learningQueue.filter(
        v => v.stage === 'learning' &&
            v.nextReviewAt &&
            v.nextReviewAt <= now
    ).length;

    return (
        <div className="border rounded p-5 mb-8 w-full max-w-2xl bg-surface border-divider">
            <div className="grid grid-cols-3 text-center gap-6">
                <Stat
                    value={dueNow}
                    label="Due now"
                    color="var(--color-accent)"
                />
                <Stat
                    value={progress.learningQueue.length}
                    label="Learning"
                    color="var(--color-primary)"
                />
                <Stat
                    value={progress.stats.totalLearned}
                    label="Mastered"
                    color="var(--color-secondary)"
                />
            </div>
        </div>
    );
};