import React from "react";
import {THEME} from "../commons/theme";
import {CenteredCard} from "./CenteredCard";

interface ExhaustedScreenProps {
    onReset: () => void;
}

export const ExhaustedScreen: React.FC<ExhaustedScreenProps> = ({
    onReset,
}) => {
    return (
        <CenteredCard>
            <h2
                className="text-xl mb-4"
                style={{
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                All caught up 🎉
            </h2>

            <p
                className="text-sm mb-6"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                There are no more words available for your current kanji level.
            </p>

            <button
                onClick={onReset}
                className="py-2 px-6 rounded transition-colors"
                style={{
                    backgroundColor: THEME.colors.accent,
                    color: THEME.colors.surface,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                Reset progress
            </button>
        </CenteredCard>
    );
};
