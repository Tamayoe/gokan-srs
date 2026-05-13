import { createContext, useContext } from 'react';

export interface NavigationContextValue {
    navigate: (path: string) => void;
    goBack: () => void;
    getParam: (key: string) => string | undefined;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useAppNavigation(): NavigationContextValue {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useAppNavigation must be used within a NavigationProvider');
    }
    return context;
}
