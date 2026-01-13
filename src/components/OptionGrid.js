import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
export const OptionGrid = (props) => {
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm uppercase tracking-wide", style: { fontFamily: THEME.fonts.gothic, color: THEME.colors.secondary }, children: props.title }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: props.options.map((opt) => {
                    const selected = opt.value === props.value;
                    return (_jsxs("button", { type: "button", onClick: () => props.onChange?.(opt.value), className: "border rounded-xl p-5 text-left transition-all", style: {
                            borderColor: selected ? THEME.colors.accent : THEME.colors.divider,
                            backgroundColor: selected
                                ? THEME.colors.accent + "22"
                                : THEME.colors.surface,
                        }, children: [_jsx("div", { className: "text-lg mb-1", style: { fontFamily: THEME.fonts.serif, color: THEME.colors.primary }, children: opt.label }), _jsx("p", { className: "text-xs", style: { fontFamily: THEME.fonts.serif, color: THEME.colors.secondary }, children: opt.description })] }, opt.value));
                }) })] }));
};
