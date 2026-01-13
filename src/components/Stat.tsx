import {THEME} from "../commons/theme";
import type {ReactNode} from "react";

export const Stat= ({ value, label, color }: { value: ReactNode, label: string, color: string }) => (
    <div>
        <p
            className="text-2xl font-serif mb-1"
            style={{ color }}
        >
            {value}
        </p>
        <p
            className="text-xs uppercase tracking-wide"
            style={{ color: THEME.colors.secondary }}
        >
            {label}
        </p>
    </div>
);
