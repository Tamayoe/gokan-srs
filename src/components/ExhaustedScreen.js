import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { THEME } from "../commons/theme";
import { CenteredCard } from "./CenteredCard";
export const ExhaustedScreen = ({ onReset, }) => {
    return (_jsxs(CenteredCard, { children: [_jsx("h2", { className: "text-xl mb-4", style: {
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.serif,
                }, children: "All caught up \uD83C\uDF89" }), _jsx("p", { className: "text-sm mb-6", style: {
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }, children: "There are no more words available for your current kanji level." }), _jsx("button", { onClick: onReset, className: "py-2 px-6 rounded transition-colors", style: {
                    backgroundColor: THEME.colors.accent,
                    color: THEME.colors.surface,
                    fontFamily: THEME.fonts.serif,
                }, children: "Reset progress" })] }));
};
