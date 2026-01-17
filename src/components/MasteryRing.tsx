import React from "react";

import { CONSTANTS } from "../commons/constants";

interface MasteryRingProps {
    mastery: number; // 0–100
    size?: number;
}

export const MasteryRing: React.FC<MasteryRingProps> = ({ mastery, size }) => {
    const radius = size ?? 18;
    const stroke = Math.round(radius / 6);
    const circumference = 2 * Math.PI * radius;
    const offset =
        circumference - (mastery / CONSTANTS.srs.mastery.max) * circumference;

    return (
        <svg width={44} height={44}>
            <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                className="stroke-divider"
                strokeWidth={stroke}
            />
            <circle
                cx="22"
                cy="22"
                r={radius}
                fill="none"
                className="stroke-accent"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
            />
            <text
                x="50%"
                y="52%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-secondary font-gothic text-[10px]"
            >
                {Math.round(mastery)}%
            </text>
        </svg>
    );
};