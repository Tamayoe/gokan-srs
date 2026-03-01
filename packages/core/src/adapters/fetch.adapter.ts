/**
 * Platform-agnostic fetch adapter for loading vocabulary data.
 *
 * Web:    baseUrl = '/data/compiled' (served by Vite/S3)
 * Mobile: baseUrl = resolved local filesystem path via expo-asset
 *
 * Inject the appropriate adapter into VocabularyService.configure().
 */
export interface FetchAdapter {
    fetchJson<T>(path: string): Promise<T>;
}

/**
 * Default web adapter — uses the browser fetch API with a base URL prefix.
 */
export function createWebFetchAdapter(baseUrl: string = '/data/compiled'): FetchAdapter {
    return {
        async fetchJson<T>(path: string): Promise<T> {
            const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            return response.json() as Promise<T>;
        }
    };
}
