import {THEME} from "../commons/theme";

export const OptionGrid = <T extends string>(props: {
    title: string;
    options: { value: T; label: string; description: string }[];
    value: T;
    onChange?: (v: T) => void;
}) => {
    return (
        <div className="space-y-3">
            <h3
                className="text-sm uppercase tracking-wide"
                style={{ fontFamily: THEME.fonts.gothic, color: THEME.colors.secondary }}
            >
                {props.title}
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {props.options.map((opt) => {
                    const selected = opt.value === props.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => props.onChange?.(opt.value)}
                            className="border rounded-xl p-5 text-left transition-all"
                            style={{
                                borderColor: selected ? THEME.colors.accent : THEME.colors.divider,
                                backgroundColor: selected
                                    ? THEME.colors.accent + "22"
                                    : THEME.colors.surface,
                            }}
                        >
                            <div
                                className="text-lg mb-1"
                                style={{ fontFamily: THEME.fonts.serif, color: THEME.colors.primary }}
                            >
                                {opt.label}
                            </div>
                            <p
                                className="text-xs"
                                style={{ fontFamily: THEME.fonts.serif, color: THEME.colors.secondary }}
                            >
                                {opt.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};