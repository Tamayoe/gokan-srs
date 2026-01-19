import { useContext } from 'react';
import { ResponsiveContext } from './ResponsiveContext';

export const useResponsive = () => {
    const context = useContext(ResponsiveContext);

    if (context === undefined) {
        throw new Error('useResponsive must be used within ResponsiveProvider');
    }

    return context;
};
