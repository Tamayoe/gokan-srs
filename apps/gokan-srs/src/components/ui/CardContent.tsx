import type { PropsWithChildren } from "react";

interface CardContentProps extends PropsWithChildren {
    className?: string;
}


/**
 * CardContent
 * - Enforces consistent internal padding
 * - Keeps spacing decisions explicit per card
 */
export function CardContent({ children, className = "" }: CardContentProps) {
    return (
        <div className={`px-6 py-5 ${className}`}>
            {children}
        </div>
    );
}