import React from "react";


interface MasteryRingProps {
    interval: number; // Days
    size?: number;
}

export const MasteryRing: React.FC<MasteryRingProps> = ({ interval, size = 30 }) => {
    // Map interval to visually pleasing percentage
    // 0 -> 0%
    // < 1 -> 15%
    // < 4 -> 35%
    // < 14 -> 60%
    // < 60 -> 85%
    // >= 60 -> 100%
    const getPercentage = (days: number) => {
        if (days <= 0) return 0;
        if (days < 1) return 15;
        if (days < 4) return 35;
        if (days < 14) return 60;
        if (days < 60) return 85;
        return 100;
    };

    const percentage = getPercentage(interval);

    // ... rest of SVG code ...
    const radius = size / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Color based on stage
    const getColor = (p: number) => {
        if (p >= 100) return '#10b981'; // Emerald 500
        if (p >= 60) return '#3b82f6'; // Blue 500
        if (p >= 35) return '#f59e0b'; // Amber 500
        return '#ef4444'; // Red 500
    };

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-slate-700"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="transition-all duration-500 ease-out"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke={getColor(percentage)}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
        </div>
    );
};