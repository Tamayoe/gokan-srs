import { createContext, useContext } from 'react';

export interface GoogleUser {
    access_token: string;
    name?: string;
    email?: string;
    picture?: string;
}

export interface GoogleDriveContextType {
    login: () => void;
    logout: () => void;
    downloadProgress: () => Promise<void>;
    uploadProgress: (envelope: { progress: any; settings: any }) => Promise<void>;
    isDownloading: boolean;
    isUploading: boolean;
    user: GoogleUser | null;
    isAuthenticated: boolean;
    isInitialLoadComplete: boolean;
    lastDownloadTime: number | null;
}

export const GoogleDriveContext = createContext<GoogleDriveContextType | null>(null);

export const useGoogleDrive = () => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
};
