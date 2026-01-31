// CardSection.tsx
import React from "react";


export function CardSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mb-10 last:mb-0 ${className}`}>{children}</div>;
}

export function CardDivider() {
    return (
        <div className="my-8 border-t border-divider" />
    );
}