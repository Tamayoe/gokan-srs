
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout, type TokenResponse } from '@react-oauth/google';
import { GoogleDriveSync } from '../services/google.service';
import { StorageService } from '../services/storage.service';
import { CONSTANTS } from '../commons/constants';

interface GoogleUser {
    access_token: string;
}

interface GoogleDriveContextType {
    login: () => void;
    logout: () => void;
    sync: () => Promise<boolean>;
    isSyncing: boolean;
    user: GoogleUser | null;
    isAuthenticated: boolean;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncService, setSyncService] = useState<GoogleDriveSync | null>(null);

    // Load persisted token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(CONSTANTS.storage.googleDriveTokenKey);
        if (storedToken) {
            setUser({ access_token: storedToken });
            const service = new GoogleDriveSync(storedToken);
            setSyncService(service);
            // Optionally trigger a background sync on load?
            // service.initialize().then(merged => { if(merged) console.log("Background sync init complete") });
        }
    }, []);

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/drive.file',
        onSuccess: async (tokenResponse: TokenResponse) => {
            console.log("Google Login Success", tokenResponse);
            localStorage.setItem(CONSTANTS.storage.googleDriveTokenKey, tokenResponse.access_token);

            setUser({ access_token: tokenResponse.access_token });
            const service = new GoogleDriveSync(tokenResponse.access_token);
            setSyncService(service);

            // Auto-sync on login
            await performSync(service);
        },
        onError: error => console.error('Login Failed:', error)
    });

    const logout = () => {
        googleLogout();
        localStorage.removeItem(CONSTANTS.storage.googleDriveTokenKey);
        setUser(null);
        setSyncService(null);
    };

    const performSync = async (service: GoogleDriveSync) => {
        setIsSyncing(true);
        const startTime = Date.now();
        const MIN_LOADING_TIME = 800; // ms

        try {
            // First initialize - gets remote, merges with local
            const merged = await service.initialize();

            if (merged) {
                console.log("Sync completed", merged);
                StorageService.saveProgress(merged);
            }
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            // Ensure visual feedback persists long enough to be seen
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_LOADING_TIME) {
                await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
            }
            setIsSyncing(false);
        }
    };

    const sync = async (): Promise<boolean> => {
        if (!syncService) return false;

        setIsSyncing(true);
        const startTime = Date.now();
        const MIN_LOADING_TIME = 800; // ms
        let success = false;

        try {
            const currentLocal = StorageService.loadProgress();

            if (currentLocal) {
                await syncService.sync(currentLocal as any);
                success = true;
            } else {
                // For fresh install/restore, merge local (null) with remote
                const merged = await syncService.initialize();
                if (merged) {
                    StorageService.saveProgress(merged);
                    success = true;
                }
            }
        } catch (e) {
            console.error(e);
            success = false;
        } finally {
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_LOADING_TIME) {
                await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
            }
            setIsSyncing(false);
        }
        return success;
    };

    return (
        <GoogleDriveContext.Provider value={{
            login,
            logout,
            sync,
            isSyncing,
            user,
            isAuthenticated: !!user
        }}>
            {children}
        </GoogleDriveContext.Provider>
    );
};

export const useGoogleDrive = () => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
};
