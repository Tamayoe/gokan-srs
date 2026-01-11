import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { THEME } from "../commons/theme";
import { CONSTANTS } from "../commons/constants";
export const MasteryRing = ({ mastery }) => {
    const radius = 18;
    const stroke = 3;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (mastery / CONSTANTS.srs.mastery.max) * circumference;
    return (_jsxs("svg", { width: 44, height: 44, children: [_jsx("circle", { cx: "22", cy: "22", r: radius, fill: "none", stroke: THEME.colors.divider, strokeWidth: stroke }), _jsx("circle", { cx: "22", cy: "22", r: radius, fill: "none", stroke: THEME.colors.accent, strokeWidth: stroke, strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", transform: "rotate(-90 22 22)" }), _jsxs("text", { x: "50%", y: "52%", textAnchor: "middle", dominantBaseline: "middle", style: {
                    fontSize: '10px',
                    fill: THEME.colors.secondary,
                    fontFamily: THEME.fonts.gothic,
                }, children: [Math.round(mastery), "%"] })] }));
};
