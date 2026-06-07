import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Dimensions, Platform } from 'react-native';
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

const getWindowDimensions = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return { width: window.innerWidth, height: window.innerHeight };
    }
    const { width, height } = Dimensions.get('window');
    return { width, height };
};

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }: ResponsiveProviderProps) => {
    const [dimensions, setDimensions] = useState(getWindowDimensions);

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            let timeoutId: ReturnType<typeof setTimeout>;
            const handleResize = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    setDimensions({ width: window.innerWidth, height: window.innerHeight });
                }, 150);
            };
            window.addEventListener('resize', handleResize);
            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', handleResize);
            };
        } else {
            const subscription = Dimensions.addEventListener('change', ({ window: { width, height } }) => {
                setDimensions({ width, height });
            });
            return () => subscription.remove();
        }
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
