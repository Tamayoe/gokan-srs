import { CONSTANTS } from "../commons/constants";
import { THEME } from "../commons/theme";

interface MasteryRingProps {
    memoryStrength: number; // SRS Memory Strength
    size?: number;
    showText?: boolean;
}

export const MasteryRing: React.FC<MasteryRingProps> = ({ memoryStrength, size = 30, showText = true }) => {
    const getPercentages = (strength: number) => {
        const sMin = CONSTANTS.srs.formula.minMemoryStrength;
        const sSoft = CONSTANTS.srs.formula.mastery.visualSoftCap;
        const sMax = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

        if (strength <= sMin) return { p1: 0, p2: 0 };

        // Loop 1: 0 -> Soft Cap (User Mastery)
        let p1 = 0;
        if (strength >= sSoft) {
            p1 = 100;
        } else {
            const numer = Math.log(strength / sMin);
            const denom = Math.log(sSoft / sMin);
            p1 = (numer / denom) * 100;
        }

        // Loop 2: Soft Cap -> Max Cap (Diamond Mastery)
        let p2 = 0;
        if (strength > sSoft) {
            const numer = Math.log(strength / sSoft);
            const denom = Math.log(sMax / sSoft);
            p2 = (numer / denom) * 100;
        }

        return {
            p1: Math.min(Math.max(p1, 0), 100),
            p2: Math.min(Math.max(p2, 0), 100)
        };
    };

    const { p1, p2 } = getPercentages(memoryStrength);

    // Stroke width relative to size
    const strokeWidth = Math.max(2, size / 12);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Offsets
    const offset1 = circumference - (p1 / 100) * circumference;
    const offset2 = circumference - (p2 / 100) * circumference;

    // Fixed ID for gradient (we use one global style here effectively)
    const gradientId = "shinyMasteryGradient";

    // Text Visibility logic
    const shouldShowText = showText && size >= 30;
    const fontSize = size * 0.28;

    // Percentage text to show
    const displayPercentage = Math.round(p1);

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg
                className="w-full h-full"
                style={{ transform: 'rotate(-90deg) translateZ(0)' }}
                viewBox={`0 0 ${size} ${size}`}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={THEME.mastery.loop2.gradientStart} />
                        <stop offset="100%" stopColor={THEME.mastery.loop2.gradientEnd} />
                    </linearGradient>
                </defs>

                {/* Background Track */}
                <circle
                    className="text-slate-200 dark:text-slate-700"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    shapeRendering="geometricPrecision"
                />

                {/* Loop 1 (Learning Progress) */}
                {/* When p2 > 0, this circle becomes the background for loop 2. Use muted Indigo. */}
                <circle
                    className="transition-all duration-700 ease-out"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset1}
                    strokeLinecap="round"
                    stroke={p2 > 0 ? THEME.mastery.loop2.background : THEME.mastery.loop1}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    shapeRendering="geometricPrecision"
                />

                {/* Loop 2 (Refining / Diamond / Shiny) */}
                {p2 > 0 && (
                    <circle
                        className="transition-all duration-700 ease-out"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset2}
                        strokeLinecap="round"
                        stroke={`url(#${gradientId})`} // Apply Gradient
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        shapeRendering="geometricPrecision"
                    />
                )}
            </svg>

            {shouldShowText && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span
                        className="font-bold leading-none text-slate-600 select-none"
                        style={{ fontSize: fontSize }}
                    >
                        {displayPercentage}
                    </span>
                </div>
            )}
        </div>
    );
};