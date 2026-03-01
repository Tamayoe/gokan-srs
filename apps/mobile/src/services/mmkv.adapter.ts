import { MMKV } from 'react-native-mmkv';
import { StorageAdapter } from '@gokan-srs/core/adapters/storage.adapter'; // Wait, let me check the core index.ts and paths in tsconfig

const storage = new MMKV();

export const mmkvStorageAdapter: StorageAdapter = {
    getItem: (key) => storage.getString(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
};
