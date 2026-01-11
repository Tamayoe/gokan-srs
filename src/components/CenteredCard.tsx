import React from "react";
import {THEME} from "../commons/theme";

export const CenteredCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ backgroundColor: THEME.colors.background }}
    >
        <div
            className="border rounded p-8 max-w-md w-full text-center"
            style={{
                backgroundColor: THEME.colors.surface,
                borderColor: THEME.colors.divider,
            }}
        >
            {children}
        </div>
    </div>
);