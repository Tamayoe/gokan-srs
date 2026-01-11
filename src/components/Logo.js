import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { THEME } from "../commons/theme";
export const LogoMark = ({ size = 48 }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 100 100", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("rect", { x: "2", y: "2", width: "96", height: "96", stroke: THEME.colors.primary, strokeWidth: "4", fill: "none" }), _jsx("text", { x: "50", y: "50", fontSize: "42", fontFamily: "'Noto Serif JP', serif", textAnchor: "middle", dominantBaseline: "central", fill: THEME.colors.primary, fontWeight: "400", children: "\u8A9E\u611F" })] }));
export const Logo = ({ className = '' }) => (_jsxs("div", { className: `flex items-center gap-3 ${className}`, children: [_jsx(LogoMark, { size: 48 }), _jsx("span", { className: "text-2xl tracking-wide", style: {
                color: THEME.colors.primary,
                fontFamily: THEME.fonts.serif,
            }, children: "Gokan SRS" })] }));
