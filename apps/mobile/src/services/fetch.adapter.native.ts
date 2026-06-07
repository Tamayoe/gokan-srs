import * as FileSystem from 'expo-file-system/legacy';
import type { FetchAdapter } from '@gokan-srs/core/adapters/fetch.adapter';
import { Platform } from 'react-native';
import { queryVocab, querySentences, cacheSentences } from './sqlite.service';

// Set this to the deployed web app's base URL (e.g. 'https://d1abc.cloudfront.net')
// to enable online sentence fetching and offline caching via SQLite.
// When null, sentences degrade gracefully to an empty array.
const SENTENCES_CDN_BASE_URL: string | null = null;

function assetUri(normalizedPath: string): string {
    if (Platform.OS === 'android') {
        return `file:///android_asset/data/compiled${normalizedPath}`;
    }
    return `${FileSystem.bundleDirectory}data/compiled${normalizedPath}`;
}

export function createNativeFetchAdapter(): FetchAdapter {
    return {
        async fetchJson<T>(path: string): Promise<T> {
            // Strip query strings (cache-busting params are invalid in asset URIs)
            const normalizedPath = (path.startsWith('/') ? path : `/${path}`).split('?')[0];

            try {
                // Vocab: query from SQLite (one-time migration from bundled JSON on first launch)
                const vocabMatch = normalizedPath.match(/^\/vocab\/(.+)\.json$/);
                if (vocabMatch) {
                    const entry = await queryVocab(vocabMatch[1]);
                    if (!entry) throw new Error(`Vocab not found in DB: ${vocabMatch[1]}`);
                    return entry as T;
                }

                // Sentences: check SQLite cache → CDN fetch → empty fallback
                const sentenceMatch = normalizedPath.match(/^\/sentences\/(.+)\.json$/);
                if (sentenceMatch) {
                    const vocabId = sentenceMatch[1];
                    const cached = await querySentences(vocabId);
                    if (cached !== null) return cached as unknown as T;

                    if (SENTENCES_CDN_BASE_URL) {
                        try {
                            const resp = await fetch(
                                `${SENTENCES_CDN_BASE_URL}/data/compiled/sentences/${vocabId}.json`,
                            );
                            if (resp.ok) {
                                const data = (await resp.json()) as unknown[];
                                await cacheSentences(vocabId, data);
                                return data as unknown as T;
                            }
                        } catch {
                            // Offline or CDN unavailable — fall through to []
                        }
                    }
                    return [] as unknown as T;
                }

                // Index and other files: direct asset read
                const content = await FileSystem.readAsStringAsync(assetUri(normalizedPath), {
                    encoding: FileSystem.EncodingType.UTF8,
                });
                return JSON.parse(content) as T;
            } catch (error) {
                console.error(`NativeFetchAdapter failed to load ${path}:`, error);
                throw new Error(`NativeFetchAdapter failed to fetch ${path}: ${error}`);
            }
        },
    };
}
