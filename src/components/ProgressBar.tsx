import React from "react";
import type {UserProgress} from "../models/user.model.ts";
import {THEME} from "../commons/theme.ts";

export const ProgressBar: React.FC<{ progress: UserProgress }> = ({ progress }) => {
    return (
        <div
            className="border rounded p-6 mb-8 w-full max-w-2xl"
            style={{
                backgroundColor: THEME.colors.surface,
                borderColor: THEME.colors.divider
            }}
        >
            <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                    <p
                        className="text-3xl font-serif mb-1"
                        style={{ color: THEME.colors.accent }}
                    >
                        {progress.activeQueue.length}
                    </p>
                    <p
                        className="text-xs font-sans uppercase tracking-wide"
                        style={{ color: THEME.colors.secondary }}
                    >
                        Learning
                    </p>
                </div>
                <div>
                    <p
                        className="text-3xl font-serif mb-1"
                        style={{ color: THEME.colors.primary }}
                    >
                        {progress.stats.totalLearned}
                    </p>
                    <p
                        className="text-xs font-sans uppercase tracking-wide"
                        style={{ color: THEME.colors.secondary }}
                    >
                        Mastered
                    </p>
                </div>
                <div>
                    <p
                        className="text-3xl font-serif mb-1"
                        style={{ color: THEME.colors.secondary }}
                    >
                        {progress.stats.totalReviews}
                    </p>
                    <p
                        className="text-xs font-sans uppercase tracking-wide"
                        style={{ color: THEME.colors.secondary }}
                    >
                        Reviews
                    </p>
                </div>
            </div>
        </div>
    );
};