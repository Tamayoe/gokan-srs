import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { ResponsiveContext } from "./ResponsiveContext";
import type { ResponsiveState } from "./ResponsiveContext";

interface ResponsiveProviderProps {
    readonly children: ReactNode;
}

const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
} as const;

const getResponsiveState = (width: number, height: number): ResponsiveState => ({
    width,
    height,
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isLargeDesktop: width >= BREAKPOINTS.desktop,
});

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }: ResponsiveProviderProps) => {
    const [dimensions, setDimensions] = useState(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }));

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const state = useMemo(
        () => getResponsiveState(dimensions.width, dimensions.height),
        [dimensions]
    );

    return (
        <ResponsiveContext.Provider value={state}>
            {children}
        </ResponsiveContext.Provider>
    );
};
