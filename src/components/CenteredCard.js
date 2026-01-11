import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { THEME } from "../commons/theme";
export const CenteredCard = ({ children }) => (_jsx("div", { className: "min-h-screen flex items-center justify-center p-8", style: { backgroundColor: THEME.colors.background }, children: _jsx("div", { className: "border rounded p-8 max-w-md w-full text-center", style: {
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.divider,
        }, children: children }) }));
