import {THEME} from "../commons/theme";
import React from "react";
import {CenteredCard} from "./CenteredCard";

interface WaitingScreenProps {
    nextReviewAt: Date;
    onLearnMore: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
    nextReviewAt,
    onLearnMore,
}) => {
    const minutes = Math.max(
        1,
        Math.ceil((nextReviewAt.getTime() - Date.now()) / 60000)
    );

    return (
        <CenteredCard>
            <h2
                className="text-xl mb-4"
                style={{
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                You’re done for now ✨
            </h2>

            <p
                className="text-sm mb-6"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                Your next review will be available in{' '}
                <strong>{minutes} minute{minutes > 1 ? 's' : ''}</strong>.
            </p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={onLearnMore}
                    className="py-2 px-6 rounded transition-colors"
                    style={{
                        backgroundColor: THEME.colors.accent,
                        color: THEME.colors.surface,
                        fontFamily: THEME.fonts.serif,
                    }}
                >
                    Learn more words
                </button>

                <p
                    className="text-xs text-center"
                    style={{ color: THEME.colors.secondary }}
                >
                    Recommended daily limit reached
                </p>
            </div>
        </CenteredCard>
    );
};