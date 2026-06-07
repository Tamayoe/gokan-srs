import React, { useState, useEffect, useRef } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleDriveSync, GoogleAuthError } from '@gokan-srs/core/services/google.service';
import { StorageService } from '@gokan-srs/core/services/storage.service';
import { MigrationService } from '@gokan-srs/core/services/migration.service';
import { CONSTANTS } from '@gokan-srs/core/commons/constants';
import { DEFAULT_SETTINGS } from '@gokan-srs/core/models/user.model';
import { GoogleDriveContext, type GoogleUser } from '@gokan-srs/app/context/GoogleDriveContext';

export const GoogleDriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lastDownloadTime, setLastDownloadTime] = useState<number | null>(null);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [syncService, setSyncService] = useState<GoogleDriveSync | null>(null);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    const logout = async (triggerReauth: boolean = false) => {
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.error('Failed to sign out from Google Sign-In', error);
        }
        setUser(null);
        setSyncService(null);

        if (triggerReauth) {
            setTimeout(() => {
                login();
            }, 100);
        }
    };

    const downloadProgress = async (service: GoogleDriveSync) => {
        setIsDownloading(true);
        const startTime = Date.now();
        const MIN_LOADING_TIME = 1000;

        try {
            let currentLocal = StorageService.loadProgress();
            const currentSettings = StorageService.loadSettings();

            let merged;
            if (currentLocal) {
                if (MigrationService.needsMigration(currentLocal)) {
                    currentLocal = await MigrationService.migrateMergedVocabsAsync(currentLocal as any);
                    StorageService.saveProgress(currentLocal);
                }

                const envelopeToSync = {
                    progress: currentLocal,
                    settings: currentSettings ?? DEFAULT_SETTINGS
                };

                await service.sync(envelopeToSync as any);
                merged = { progress: StorageService.loadProgress(), settings: StorageService.loadSettings() };
            } else {
                merged = await service.initialize();
                if (merged) {
                    StorageService.saveProgress(merged.progress);
                    StorageService.saveSettings(merged.settings);
                }
            }

            console.log("Download/Sync completed");
            setLastDownloadTime(Date.now());
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

    const uploadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const uploadProgress = async (envelope: { progress: any; settings: any }) => {
        if (uploadDebounceRef.current) {
            clearTimeout(uploadDebounceRef.current);
        }

        uploadDebounceRef.current = setTimeout(async () => {
            if (!syncService || isDownloading) return;

            setIsUploading(true);
            try {
                await syncService.sync(envelope as any);
            } catch (error) {
                console.error("Background upload failed:", error);
            } finally {
                setIsUploading(false);
                uploadDebounceRef.current = null;
            }
        }, 2000);
    };

    const login = async () => {
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const result = await GoogleSignin.signIn();
            if (result.type !== 'success') return;
            const tokens = await GoogleSignin.getTokens();

            const googleUser: GoogleUser = {
                access_token: tokens.accessToken,
                name: result.data.user.name ?? undefined,
                email: result.data.user.email,
                picture: result.data.user.photo ?? undefined
            };

            setUser(googleUser);

            const service = new GoogleDriveSync(tokens.accessToken);
            setSyncService(service);
            await downloadProgress(service);
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            logout();
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
                if (hasPreviousSignIn) {
                    const result = await GoogleSignin.signInSilently();
                    if (result.type !== 'success') {
                        setIsInitialLoadComplete(true);
                        return;
                    }
                    const tokens = await GoogleSignin.getTokens();

                    const googleUser: GoogleUser = {
                        access_token: tokens.accessToken,
                        name: result.data.user.name ?? undefined,
                        email: result.data.user.email,
                        picture: result.data.user.photo ?? undefined
                    };

                    setUser(googleUser);

                    const service = new GoogleDriveSync(tokens.accessToken);
                    setSyncService(service);
                    await downloadProgress(service);
                } else {
                    setIsInitialLoadComplete(true);
                }
            } catch (error) {
                console.error('Failed to initialize Google Sign-In automatically', error);
                setIsInitialLoadComplete(true);
            }
        };

        init();
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
