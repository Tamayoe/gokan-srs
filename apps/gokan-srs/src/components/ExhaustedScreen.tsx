import React from "react";
import { Link } from "react-router-dom";
import { CenteredCard } from "./CenteredCard";

export const ExhaustedScreen: React.FC = () => {
    return (
        <CenteredCard>
            <h2 className="text-xl mb-4 text-primary font-serif">
                All caught up 🎉
            </h2>

            <p className="text-sm text-secondary font-serif mb-6">
                Come back tomorrow.
            </p>

            <Link to="/" className="text-xs text-secondary hover:text-primary transition-colors">
                Back to activities
            </Link>
        </CenteredCard>
    );
};
