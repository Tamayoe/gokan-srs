import React from "react";
import {THEME} from "../commons/theme.ts";

export const LogoMark: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="96" height="96" stroke={THEME.colors.primary} strokeWidth="4" fill="none"/>
        <text
            x="50"
            y="50"
            fontSize="42"
            fontFamily="'Noto Serif JP', serif"
            textAnchor="middle"
            dominantBaseline="central"
            fill={THEME.colors.primary}
            fontWeight="400"
        >
            語感
        </text>
    </svg>
);

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <LogoMark size={48} />
        <span
            className="text-2xl font-serif tracking-wide"
            style={{ color: THEME.colors.primary }}
        >
      Gokan SRS
    </span>
    </div>
);