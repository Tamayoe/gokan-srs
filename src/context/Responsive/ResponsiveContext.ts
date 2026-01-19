import { createContext } from 'react';

interface ResponsiveState {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
}

const ResponsiveContext = createContext<ResponsiveState | undefined>(undefined);

export { ResponsiveContext };
export type { ResponsiveState };
