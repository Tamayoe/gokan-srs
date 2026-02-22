import React from "react";

import { CenteredCard } from "./CenteredCard";

export const ExhaustedScreen: React.FC = () => {
    return (
        <CenteredCard>
            <h2 className="text-xl mb-4 text-primary font-serif">
                All caught up 🎉
            </h2>

            <p className="text-sm text-secondary font-serif">
                Come back tomorrow.
            </p>
        </CenteredCard>
    );
};
