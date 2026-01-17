

export const OptionGrid = <T extends string>(props: {
    title: string;
    options: { value: T; label: string; description: string }[];
    value: T;
    onChange?: (v: T) => void;
}) => {
    return (
        <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wide font-gothic text-secondary">
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
                            className={`
                                border rounded-xl p-5 text-left transition-all
                                ${selected
                                    ? "border-accent bg-accent/10 dark:bg-accent/20"
                                    : "border-divider bg-surface hover:bg-surface-hover"
                                }
                            `}
                        >
                            <div className="text-lg mb-1 font-serif text-primary">
                                {opt.label}
                            </div>
                            <p className="text-xs font-serif text-secondary">
                                {opt.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};