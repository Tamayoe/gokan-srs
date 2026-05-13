import * as FileSystem from 'expo-file-system';
import type { FetchAdapter } from '@gokan-srs/core/adapters/fetch.adapter';
import { Platform } from 'react-native';

export function createNativeFetchAdapter(): FetchAdapter {
    return {
        async fetchJson<T>(path: string): Promise<T> {
            try {
                // Ensure path starts with a slash
                const normalizedPath = path.startsWith('/') ? path : `/${path}`;
                
                let fileUri = '';
                if (Platform.OS === 'android') {
                    // On Android, assets bundled in the APK are accessible via the android_asset URI
                    fileUri = `file:///android_asset/data/compiled${normalizedPath}`;
                } else if (Platform.OS === 'ios') {
                    // On iOS, they are in the main bundle directory
                    fileUri = `${FileSystem.bundleDirectory}data/compiled${normalizedPath}`;
                }

                // Read file content as string
                const content = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.UTF8
                });
                
                return JSON.parse(content) as T;
            } catch (error) {
                console.error(`NativeFetchAdapter failed to load ${path}:`, error);
                throw new Error(`NativeFetchAdapter failed to fetch ${path}: ${error}`);
            }
        }
    };
}
