// Button.tsx
import type { ButtonHTMLAttributes } from "react";
import {THEME} from "../../commons/theme";

type ButtonVariant = "primary" | "secondary";

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
    const disabled = props.disabled ?? false;

    return (
        <button
            {...props}
            className={`font-medium rounded transition-colors ${className}`}
            style={{
                height: THEME.sizes.buttonHeight,
                fontFamily: THEME.fonts.serif,
                fontSize: THEME.fontSizes.base,
                borderRadius: THEME.sizes.borderRadius,
                cursor: disabled ? "not-allowed" : "pointer",

                backgroundColor: disabled
                    ? THEME.colors.divider
                    : isPrimary
                        ? THEME.colors.accent
                        : THEME.colors.feedbackBackground,

                color: isPrimary
                    ? THEME.colors.surface
                    : THEME.colors.primary,

                border: isPrimary
                    ? "none"
                    : `1px solid ${THEME.colors.divider}`,
            }}
            onMouseEnter={(e) => {
                if (disabled) return;
                e.currentTarget.style.backgroundColor = isPrimary
                    ? THEME.colors.accentHover
                    : THEME.colors.surface;
            }}
            onMouseLeave={(e) => {
                if (disabled) return;
                e.currentTarget.style.backgroundColor = isPrimary
                    ? THEME.colors.accent
                    : THEME.colors.feedbackBackground;
            }}
        >
            {children}
        </button>
    );
}
