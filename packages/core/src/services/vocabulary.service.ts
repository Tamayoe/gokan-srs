import type { Vocabulary } from '../models/vocabulary.model';
import type { FrequencyIndex, KKLCIndex, KKLCKanjiIndex } from '../models/index.model';
import type { FetchAdapter } from '../adapters/fetch.adapter';

/**
 * Platform-agnostic vocabulary loader.
 *
 * Call VocabularyService.configure(adapter) once at app startup:
 *   - Web:    VocabularyService.configure(createWebFetchAdapter('/data/compiled'))
 *   - Mobile: VocabularyService.configure(createNativeFetchAdapter(resolvedAssetDir))
 */
export class VocabularyService {
    private static _adapter: FetchAdapter | null = null;
    private static kklcIndex: KKLCIndex | null = null;
    private static kklcKanjiIndex: KKLCKanjiIndex | null = null;
    private static frequencyIndex: FrequencyIndex | null = null;
    private static vocabCache = new Map<string, Vocabulary>();

    static configure(adapter: FetchAdapter): void {
        this._adapter = adapter;
        // Clear caches when adapter changes (e.g. on re-initialization)
        this.kklcIndex = null;
        this.kklcKanjiIndex = null;
        this.frequencyIndex = null;
        this.vocabCache.clear();
    }

    private static get adapter(): FetchAdapter {
        if (!this._adapter) {
            // Fallback: web fetch with default base URL
            if (typeof fetch !== 'undefined') {
                return {
                    async fetchJson<T>(path: string): Promise<T> {
                        const url = `/data/compiled${path}`;
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
                        return response.json() as Promise<T>;
                    }
                };
            }
            throw new Error('[VocabularyService] No adapter configured. Call VocabularyService.configure(adapter) before use.');
        }
        return this._adapter;
    }

    static async loadKKLCKanjiIndex(): Promise<KKLCKanjiIndex | null> {
        if (this.kklcKanjiIndex) return this.kklcKanjiIndex;
        this.kklcKanjiIndex = await this.adapter.fetchJson<KKLCKanjiIndex>(`/index/kklc-kanji.json?v=${Date.now()}`);
        return this.kklcKanjiIndex;
    }

    static async loadKKLCIndex(): Promise<KKLCIndex | null> {
        if (this.kklcIndex) return this.kklcIndex;
        this.kklcIndex = await this.adapter.fetchJson<KKLCIndex>(`/index/kklc.json?v=${Date.now()}`);
        return this.kklcIndex;
    }

    static async loadFrequencyIndex(): Promise<FrequencyIndex | null> {
        if (this.frequencyIndex) return this.frequencyIndex;
        this.frequencyIndex = await this.adapter.fetchJson<FrequencyIndex>(`/index/frequency.json?v=${Date.now()}`);
        return this.frequencyIndex;
    }

    static async loadVocab(id: string): Promise<Vocabulary> {
        if (this.vocabCache.has(id)) {
            return this.vocabCache.get(id)!;
        }
        const vocab = await this.adapter.fetchJson<Vocabulary>(`/vocab/${id}.json`);
        this.vocabCache.set(id, vocab);
        return vocab;
    }

    static async loadSentences(vocabId: string): Promise<import('../models/sentence.model').Sentence[] | null> {
        try {
            return await this.adapter.fetchJson<import('../models/sentence.model').Sentence[]>(`/sentences/${vocabId}.json`);
        } catch {
            // No sentences found for this vocab is a valid state
            return null;
        }
    }

    static async fetchMergedMap(): Promise<Record<string, string> | null> {
        try {
            return await this.adapter.fetchJson<Record<string, string>>(`/index/merged-map.json?t=${Date.now()}`);
        } catch {
            return null;
        }
    }
}
