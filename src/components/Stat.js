import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
export const Stat = ({ value, label, color }) => (_jsxs("div", { children: [_jsx("p", { className: "text-2xl font-serif mb-1", style: { color }, children: value }), _jsx("p", { className: "text-xs uppercase tracking-wide", style: { color: THEME.colors.secondary }, children: label })] }));
