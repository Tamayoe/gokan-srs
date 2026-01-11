import {THEME} from "../commons/theme";

export const Stat = ({ value, label, color }: any) => (
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