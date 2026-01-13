import {THEME} from "../commons/theme";

export function LoadingScreen() {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ backgroundColor: THEME.colors.background }}
        >
            <div style={{ color: THEME.colors.secondary }}>Loading vocabulary...</div>
        </div>
    );
}
