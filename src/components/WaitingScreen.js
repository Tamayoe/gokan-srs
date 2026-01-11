import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
import React from "react";
import { CenteredCard } from "./CenteredCard";
export const WaitingScreen = ({ nextReviewAt, onLearnMore, }) => {
    const minutes = Math.max(1, Math.ceil((nextReviewAt.getTime() - Date.now()) / 60000));
    return (_jsxs(CenteredCard, { children: [_jsx("h2", { className: "text-xl mb-4", style: {
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.serif,
                }, children: "You\u2019re done for now \u2728" }), _jsxs("p", { className: "text-sm mb-6", style: {
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }, children: ["Your next review will be available in", ' ', _jsxs("strong", { children: [minutes, " minute", minutes > 1 ? 's' : ''] }), "."] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("button", { onClick: onLearnMore, className: "py-2 px-6 rounded transition-colors", style: {
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }, children: "Learn more words" }), _jsx("p", { className: "text-xs text-center", style: { color: THEME.colors.secondary }, children: "Recommended daily limit reached" })] })] }));
};
