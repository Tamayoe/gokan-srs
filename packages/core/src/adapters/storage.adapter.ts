/**
 * Platform-agnostic storage interface.
 *
 * Web:    inject `window.localStorage` (synchronous)
 * Mobile: inject MMKV adapter (synchronous, matches this interface)
 *
 * All methods are intentionally synchronous to match localStorage's API.
 * MMKV on React Native is also synchronous, making this a clean fit.
 */
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * Default web adapter — wraps window.localStorage directly.
 * Import this in apps/web and pass to StorageService.configure().
 */
export const localStorageAdapter: StorageAdapter = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
};
