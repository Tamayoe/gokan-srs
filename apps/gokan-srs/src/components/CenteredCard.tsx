import React from "react";


export const CenteredCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="border rounded p-8 max-w-md w-full text-center bg-surface border-divider">
            {children}
        </div>
    </div>
);