

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout, type TokenResponse } from '@react-oauth/google';
import { GoogleDriveSync, GoogleAuthError } from '../services/google.service';
import { StorageService } from '../services/storage.service';
import { CONSTANTS } from '../commons/constants';

interface GoogleUser {
    access_token: string;
    name?: string;
    email?: string;
    picture?: string;
}

interface GoogleDriveContextType {
    login: () => void;
    logout: () => void;
    sync: () => Promise<boolean>;
    isSyncing: boolean;
    user: GoogleUser | null;
    isAuthenticated: boolean;
    isInitialSyncComplete: boolean;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncService, setSyncService] = useState<GoogleDriveSync | null>(null);
    const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(true); // Default true for no-sync case

    // Fetch user profile from Google
    const fetchUserProfile = async (accessToken: string): Promise<Partial<GoogleUser>> => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json();
            return {
                name: data.name,
                email: data.email,
                picture: data.picture
            };
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            return {};
        }
    };

    // Load persisted token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(CONSTANTS.storage.googleDriveTokenKey);
        if (storedToken) {
            setIsInitialSyncComplete(false); // Start as not complete

            // Fetch user profile and set user state
            fetchUserProfile(storedToken).then(profile => {
                setUser({ access_token: storedToken, ...profile });
            });

            const service = new GoogleDriveSync(storedToken);
            setSyncService(service);

            // Trigger background sync on load to fetch latest progress from Drive
            service.initialize().then(merged => {
                if (merged) {
                    console.log("Background sync init complete");
                    StorageService.saveProgress(merged);
                }
                setIsInitialSyncComplete(true); // Mark as complete
            }).catch(error => {
                console.error("Background sync failed:", error);

                // If authentication failed, log out the user
                if (error instanceof GoogleAuthError) {
                    console.error('Authentication expired on initial sync, logging out. User must re-authenticate manually.');

                    // Clear the stored token and reset state
                    localStorage.removeItem(CONSTANTS.storage.googleDriveTokenKey);
                    setUser(null);
                    setSyncService(null);
                }

                setIsInitialSyncComplete(true); // Allow app to proceed even on error
            });
        }
    }, []);

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        onSuccess: async (tokenResponse: TokenResponse) => {
            console.log("Google Login Success", tokenResponse);
            localStorage.setItem(CONSTANTS.storage.googleDriveTokenKey, tokenResponse.access_token);

            // Fetch user profile
            const profile = await fetchUserProfile(tokenResponse.access_token);
            setUser({ access_token: tokenResponse.access_token, ...profile });

            const service = new GoogleDriveSync(tokenResponse.access_token);
            setSyncService(service);

            // Auto-sync on login
            await performSync(service);
        },
        onError: error => {
            console.error('Login Failed:', error);
            // If user cancels or login fails, ensure they're logged out
            // This returns the app to the default state
            logout();
        }
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

            // If authentication failed, log out the user and trigger re-auth
            if (error instanceof GoogleAuthError) {
                console.error('Authentication expired, logging out. User must re-authenticate manually.');
                logout(); // Pass true to trigger re-authentication
            }
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

            // If authentication failed, log out the user and trigger re-auth
            if (e instanceof GoogleAuthError) {
                console.error('Authentication expired, logging out. User must re-authenticate manually.');
                logout(); // Pass true to trigger re-authentication
            }
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
            isAuthenticated: !!user,
            isInitialSyncComplete
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
