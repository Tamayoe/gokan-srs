

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
    downloadProgress: () => Promise<void>;
    uploadProgress: (progress: any) => Promise<void>;
    isDownloading: boolean;
    isUploading: boolean;
    user: GoogleUser | null;
    isAuthenticated: boolean;
    isInitialLoadComplete: boolean; // Renamed from isInitialSyncComplete
    lastDownloadTime: number | null; // Renamed from lastSyncTime
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lastDownloadTime, setLastDownloadTime] = useState<number | null>(null);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [syncService, setSyncService] = useState<GoogleDriveSync | null>(null);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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

    const logout = (triggerReauth: boolean = false) => {
        googleLogout();
        localStorage.removeItem(CONSTANTS.storage.googleDriveTokenKey);
        setUser(null);
        setSyncService(null);

        if (triggerReauth) {
            setTimeout(() => {
                console.log('Triggering re-authentication...');
                login();
            }, 100);
        }
    };

    // BLOCKING DOWNLOAD: Fetches remote, merges, updates local storage, triggers app reload
    const downloadProgress = async (service: GoogleDriveSync) => {
        setIsDownloading(true);
        const startTime = Date.now();
        const MIN_LOADING_TIME = 1000; // slightly longer for "heavy" feel

        try {
            const currentLocal = StorageService.loadProgress();

            // We use the sync method because it handles the logic of "Fetch Remote -> Merge"
            // We want to ensure we have the latest from cloud before we start.
            // If we have local data, we merge. If not, we initialize.
            let merged;
            if (currentLocal) {
                // Even on download, we might have local changes (offline). 
                // sync() will upload them. This is technically a "Sync", but treated as a Download event for the UI.
                await service.sync(currentLocal as any);
                // We reload from storage to see the result
                merged = StorageService.loadProgress();
            } else {
                merged = await service.initialize();
                if (merged) StorageService.saveProgress(merged);
            }

            console.log("Download/Sync completed");
            setLastDownloadTime(Date.now()); // Triggers QuizContext reload
        } catch (error) {
            console.error("Download failed:", error);
            if (error instanceof GoogleAuthError) {
                logout(true);
            }
        } finally {
            const elapsed = Date.now() - startTime;
            if (elapsed < MIN_LOADING_TIME) {
                await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
            }
            setIsDownloading(false);
            setIsInitialLoadComplete(true);
        }
    };

    // BACKGROUND UPLOAD: Pushes local changes to cloud. Does NOT trigger app reload.
    const uploadProgress = async (progress: any) => {
        if (!syncService || isDownloading) return;

        setIsUploading(true);
        try {
            // sync() method does: Fetch Remote -> Merge -> Upload -> Save Local
            // We trust it to update localStorage with the latest state.
            await syncService.sync(progress);
            console.log("Background upload completed");
            // NOTE: We do NOT setLastDownloadTime here. 
            // QuizContext keeps using its current state (which is ahead or equal to what we just uploaded).
            // LocalStorage is updated in background for next reload.
        } catch (error) {
            console.error("Background upload failed:", error);
            // Silent fail for background uploads, or maybe a small toast?
            // If auth error, we might want to prompt, but sticky auth errors are annoying.
            // For now, let's only logout on critical/download actions or repeated failures?
            // Actually, if auth is dead, we should probably stop.
            if (error instanceof GoogleAuthError) {
                // Maybe set a flag "AuthFailed"? For now, aggressive re-auth is safer for data.
                // logout(true); 
            }
        } finally {
            setIsUploading(false);
        }
    };

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

            // Auto-download on login
            await downloadProgress(service);
        },
        onError: error => {
            console.error('Login Failed:', error);
            logout();
        }
    });

    // Load persisted token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(CONSTANTS.storage.googleDriveTokenKey);
        if (storedToken) {
            // Fetch user profile and set user state
            fetchUserProfile(storedToken).then(profile => {
                setUser({ access_token: storedToken, ...profile });
            });

            const service = new GoogleDriveSync(storedToken);
            setSyncService(service);

            // Trigger blocking download on mount
            downloadProgress(service);
        } else {
            setIsInitialLoadComplete(true); // No user, load is "complete" (ready for guest/setup)
        }
    }, []);

    return (
        <GoogleDriveContext.Provider value={{
            login,
            logout,
            downloadProgress: () => syncService ? downloadProgress(syncService) : Promise.resolve(),
            uploadProgress,
            isDownloading,
            isUploading,
            user,
            isAuthenticated: !!user,
            isInitialLoadComplete,
            lastDownloadTime
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
