import { CONSTANTS } from "../commons/constants";

interface MasteryRingProps {
    memoryStrength: number; // SRS Memory Strength
    size?: number;
}

export const MasteryRing: React.FC<MasteryRingProps> = ({ memoryStrength, size = 30 }) => {
    // Logarithmic progress
    // P = 100 * log(S) / log(S_max)
    // We treat S < 1 as effectively 0-ish for the log scale to avoid negatives, 
    // or we clamp.
    // Actually S ranges from ~0.3 upwards.
    // log(0.3) is negative.
    // Let's us clamp the input strength to >= 1 for the visual calculation so we start at 0%.
    // Or maybe we want to show some progress even for low strength?
    // If S=0.3 (min), log(0.3) = -1.2.
    // If we want 0% at S_min=0.3?. 
    // Let's shift it? 
    // P = log(S / S_min) / log(S_max / S_min) ?
    // If S=0.3, P=0. If S=S_max, P=100.
    // Let's try that.

    const getPercentage = (strength: number) => {
        const sMin = CONSTANTS.srs.formula.minMemoryStrength;
        const sMax = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

        // Sanity check
        if (strength <= sMin) return 5; // Minimal visibility

        const numer = Math.log(strength / sMin);
        const denom = Math.log(sMax / sMin);

        const p = (numer / denom) * 100;
        return Math.min(Math.max(p, 5), 100); // Clamp 5-100
    };

    const percentage = getPercentage(memoryStrength);

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