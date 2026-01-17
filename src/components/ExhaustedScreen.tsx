import React from "react";

import { CenteredCard } from "./CenteredCard";

interface ExhaustedScreenProps {
    onReset: () => void;
}

export const ExhaustedScreen: React.FC<ExhaustedScreenProps> = ({
    onReset,
}) => {
    return (
        <CenteredCard>
            <h2 className="text-xl mb-4 text-primary font-serif">
                All caught up 🎉
            </h2>

            <p className="text-sm mb-6 text-secondary font-serif">
                There are no more words available for your current kanji level.
            </p>

            <button
                onClick={onReset}
                className="py-2 px-6 rounded transition-colors bg-accent text-surface font-serif hover:bg-accent-hover"
            >
                Reset progress
            </button>
        </CenteredCard>
    );
};
