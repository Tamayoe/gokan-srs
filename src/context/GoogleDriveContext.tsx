import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleLogin, googleLogout, type TokenResponse } from '@react-oauth/google';
import { GoogleDriveSync, GoogleAuthError } from '../services/sync/googleDriveSync';
import { StorageService } from '../services/storage.service';
import { MigrationService } from '../services/migration.service';
import { CONSTANTS } from '../commons/constants';
import {DEFAULT_SETTINGS, type UserProgress, type UserSettings} from '../models/user.model';

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
    uploadProgress: (envelope: { progress: UserProgress; settings: UserSettings }) => Promise<void>;
    isDownloading: boolean;
    isUploading: boolean;
    user: GoogleUser | null;
    isAuthenticated: boolean;
    isInitialLoadComplete: boolean; // Renamed from isInitialSyncComplete
    lastDownloadTime: number | null; // Renamed from lastSyncTime
    /** Bumped after a successful background sync that pulled in remote changes.
     *  Unlike lastDownloadTime, consumers should MERGE against this (not replace
     *  state wholesale) so an in-flight action isn't lost. */
    lastBackgroundMergeTime: number | null;
    /** True when a background upload failed due to an expired/invalid token.
     *  Surfaces visibly instead of silently stopping sync. */
    syncPaused: boolean;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lastDownloadTime, setLastDownloadTime] = useState<number | null>(null);
    const [lastBackgroundMergeTime, setLastBackgroundMergeTime] = useState<number | null>(null);
    const [syncPaused, setSyncPaused] = useState(false);
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
        setSyncPaused(false);

        if (triggerReauth) {
            setTimeout(() => {
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
            let currentLocal = StorageService.loadProgress();
            const currentSettings = StorageService.loadSettings();

            // We use the sync method because it handles the logic of "Fetch Remote -> Merge"
            // We want to ensure we have the latest from cloud before we start.
            // If we have local data, we merge. If not, we initialize.
            if (currentLocal) {
                // Async migration before syncing to prevent local old IDs from duplicating with remote new IDs
                if (MigrationService.needsMigration(currentLocal)) {
                    currentLocal = await MigrationService.migrateMergedVocabsAsync(currentLocal);
                    StorageService.saveProgress(currentLocal);
                }

                const envelopeToSync = {
                    progress: currentLocal,
                    settings: currentSettings ?? DEFAULT_SETTINGS
                };

                // Even on download, we might have local changes (offline).
                // sync() will upload them. This is technically a "Sync", but treated as a Download event for the UI.
                await service.sync(envelopeToSync);
            } else {
                const merged = await service.initialize();
                if (merged) {
                    StorageService.saveProgress(merged.progress);
                    StorageService.saveSettings(merged.settings);
                }
            }

            setSyncPaused(false);
            setLastDownloadTime(Date.now()); // Triggers a full reload in QuizContext
        } catch (error) {
            console.error('[GoogleDriveContext] Download failed:', error);
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

    // Use generic type compatible with browser (number) and Node (object)
    const uploadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Read by the stable uploadProgress callback below - keeping these in refs
    // (instead of closing over state) is what lets uploadProgress keep one identity
    // for the provider's whole lifetime. Every sync toggles isUploading and bumps
    // lastBackgroundMergeTime, so a per-render uploadProgress would re-fire any
    // consumer effect that depends on it, on every sync, forever.
    const syncServiceRef = useRef<GoogleDriveSync | null>(null);
    syncServiceRef.current = syncService;
    const isDownloadingRef = useRef(false);
    isDownloadingRef.current = isDownloading;

    // BACKGROUND UPLOAD: Pushes local changes to cloud. Does NOT trigger a full app reload -
    // instead bumps lastBackgroundMergeTime so callers can reconcile (merge) any remote
    // changes into live state without discarding whatever the user is doing right now.
    const uploadProgress = useCallback(async (envelope: { progress: any; settings: any }) => {
        if (uploadDebounceRef.current) {
            clearTimeout(uploadDebounceRef.current);
        }

        uploadDebounceRef.current = setTimeout(async () => {
            const service = syncServiceRef.current;
            if (!service || isDownloadingRef.current) return;

            setIsUploading(true);
            try {
                // sync() does: Fetch Remote -> Merge (or fast-forward) -> Upload -> Save Local.
                const outcome = await service.sync(envelope);
                setSyncPaused(false);
                // Only signal a reconcile when the sync actually pulled in remote
                // content this client hadn't written itself. A routine upload of
                // local-only changes must not bump this - otherwise every answer
                // would trigger a reconcile pass and reload the active quiz card.
                if (outcome?.pulledRemoteChanges) {
                    setLastBackgroundMergeTime(Date.now());
                }
            } catch (error) {
                console.error('[GoogleDriveContext] Background upload failed:', error);
                if (error instanceof GoogleAuthError) {
                    // Surface visibly rather than silently stopping - the user should know
                    // their progress isn't being backed up until they reconnect.
                    setSyncPaused(true);
                }
            } finally {
                setIsUploading(false);
                uploadDebounceRef.current = null;
            }
        }, 2000); // 2 second debounce to gather rapid changes (e.g. typing or quick settings toggles)
    }, []);

    const login = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        onSuccess: async (tokenResponse: TokenResponse) => {
            localStorage.setItem(CONSTANTS.storage.googleDriveTokenKey, tokenResponse.access_token);

            const profile = await fetchUserProfile(tokenResponse.access_token);
            setUser({ access_token: tokenResponse.access_token, ...profile });
            setSyncPaused(false);

            const service = new GoogleDriveSync(tokenResponse.access_token);
            setSyncService(service);

            // Auto-download on login
            await downloadProgress(service);
        },
        onError: error => {
            console.error('[GoogleDriveContext] Login failed:', error);
            logout();
        }
    });

    // Load persisted token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(CONSTANTS.storage.googleDriveTokenKey);
        if (storedToken) {
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
            lastDownloadTime,
            lastBackgroundMergeTime,
            syncPaused,
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
