import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
import { Logo } from "./Logo";
export function SetupHeader() {
    return (_jsxs("div", { className: "text-center mb-16", children: [_jsx(Logo, { className: "justify-center mb-6" }), _jsx("p", { className: "text-sm", style: {
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }, children: "A focused vocabulary learning system" })] }));
}
