import { jsx as _jsx } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
export function LoadingScreen() {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center", style: { backgroundColor: THEME.colors.background }, children: _jsx("div", { style: { color: THEME.colors.secondary }, children: "Loading vocabulary..." }) }));
}
