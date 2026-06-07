import { createMMKV } from 'react-native-mmkv';
import { StorageAdapter } from '@gokan-srs/core/adapters/storage.adapter';

const storage = createMMKV();

export const mmkvStorageAdapter: StorageAdapter = {
    getItem: (key) => storage.getString(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
};
