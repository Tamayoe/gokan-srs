import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { THEME } from "../commons/theme";
import { Stat } from "./Stat";
export const ProgressBar = ({ progress }) => {
    const now = new Date();
    const dueNow = progress.learningQueue.filter(v => v.stage === 'learning' &&
        v.nextReviewAt &&
        v.nextReviewAt <= now).length;
    return (_jsx("div", { className: "border rounded p-5 mb-8 w-full max-w-2xl", style: {
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.divider,
        }, children: _jsxs("div", { className: "grid grid-cols-3 text-center gap-6", children: [_jsx(Stat, { value: dueNow, label: "Due now", color: THEME.colors.accent }), _jsx(Stat, { value: progress.learningQueue.length, label: "Learning", color: THEME.colors.primary }), _jsx(Stat, { value: progress.stats.totalLearned, label: "Mastered", color: THEME.colors.secondary })] }) }));
};
