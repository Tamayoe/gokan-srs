import type { PropsWithChildren } from "react";
import { motion } from "framer-motion";

interface CardProps extends PropsWithChildren {
    interactive?: boolean;
    className?: string;
    size?: "sm" | "md" | "lg";
}

const SIZE_STYLES = {
    sm: "p-4 max-w-md",
    md: "p-8 max-w-xl",
    lg: "p-12 max-w-2xl",
};

export function Card({
    children,
    interactive = false,
    size = "md",
    className = "",
}: CardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`
                w-full mx-auto rounded-2xl bg-surface border border-divider
                ${SIZE_STYLES[size]} 
                ${interactive ? "hover:bg-surface-hover cursor-pointer" : ""}
                ${className}
            `}
        >
            {children}
        </motion.div>
    );
}