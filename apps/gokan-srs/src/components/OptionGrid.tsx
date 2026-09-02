import type { ReactNode } from "react";

export const OptionGrid = <T extends string>(props: {
    title: string;
    options: { value: T; label: string; description: ReactNode }[];
    value: T;
    onChange?: (v: T) => void;
    /** Single-column, tighter spacing - for the narrow in-quiz settings popover. */
    dense?: boolean;
}) => {
    const dense = props.dense === true;

    return (
        <div className={dense ? "space-y-2" : "space-y-3"}>
            <h3 className={`uppercase tracking-wide font-gothic text-secondary ${dense ? 'text-xs' : 'text-sm'}`}>
                {props.title}
            </h3>
            <div className={dense ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-4"}>
                {props.options.map((opt) => {
                    const selected = opt.value === props.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => props.onChange?.(opt.value)}
                            className={`
                                border rounded-xl text-left transition-all
                                ${dense ? "p-3" : "p-5"}
                                ${selected
                                    ? "border-accent bg-accent/10 dark:bg-accent/20"
                                    : "border-divider bg-surface hover:bg-surface-hover"
                                }
                            `}
                        >
                            <div className={`mb-1 font-serif text-primary ${dense ? 'text-sm' : 'text-lg'}`}>
                                {opt.label}
                            </div>
                            <div className="text-xs font-serif text-secondary flex items-start">
                                {opt.description}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
