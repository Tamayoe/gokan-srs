// CardSection.tsx
import React from "react";


export function CardSection({ children }: { children: React.ReactNode }) {
    return <div className="mb-10 last:mb-0">{children}</div>;
}

export function CardDivider() {
    return (
        <div className="my-8 border-t border-divider" />
    );
}