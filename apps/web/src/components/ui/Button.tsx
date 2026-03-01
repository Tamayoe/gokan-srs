// Button.tsx
import type { ButtonHTMLAttributes } from "react";


type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export function Button({
    children,
    variant = "primary",
    className = "",
    ...props
}: ButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <button
            {...props}
            className={`
                h-11 px-4 rounded-md font-serif text-base transition-colors duration-200
                flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-divider
                ${isPrimary
                    ? "bg-accent text-surface hover:bg-accent-hover border-transparent"
                    : variant === "ghost"
                        ? "bg-transparent text-secondary hover:text-primary border-transparent shadow-none px-2 h-auto"
                        : "bg-feedback-background text-primary border border-divider hover:bg-surface"
                }
                ${className}
            `.trim().replace(/\s+/g, ' ')}
        >
            {children}
        </button>
    );
}
