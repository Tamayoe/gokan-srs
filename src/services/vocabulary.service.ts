// src/services/VocabularyLoader.ts
import type { Vocabulary } from '../models/vocabulary.model';
import type { FrequencyIndex, KKLCIndex, KKLCKanjiIndex } from '../models/index.model';

export class VocabularyService {
    private static kklcIndex: KKLCIndex | null = null;
    private static kklcKanjiIndex: KKLCKanjiIndex | null = null;
    private static frequencyIndex: FrequencyIndex | null = null;
    private static vocabCache = new Map<string, Vocabulary>();

    private static async fetchJson<T>(path: string): Promise<T> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
        return response.json();
    }

    static async loadKKLCKanjiIndex(): Promise<KKLCKanjiIndex | null> {
        if (this.kklcKanjiIndex) return this.kklcKanjiIndex;

        this.kklcKanjiIndex = await this.fetchJson<KKLCKanjiIndex>('/data/compiled/index/kklc-kanji.json');
        return this.kklcKanjiIndex;
    }

    static async loadKKLCIndex(): Promise<KKLCIndex | null> {
        if (this.kklcIndex) return this.kklcIndex;

        this.kklcIndex = await this.fetchJson<KKLCIndex>('/data/compiled/index/kklc.json');
        return this.kklcIndex;
    }

    static async loadFrequencyIndex(): Promise<FrequencyIndex | null> {
        if (this.frequencyIndex) return this.frequencyIndex;

        this.frequencyIndex = await this.fetchJson<FrequencyIndex>('/data/compiled/index/frequency.json');
        return this.frequencyIndex;
    }

    static async loadVocab(id: string): Promise<Vocabulary> {
        if (this.vocabCache.has(id)) {
            return this.vocabCache.get(id)!;
        }

        const vocab = await this.fetchJson<Vocabulary>(`/data/compiled/vocab/${id}.json`);
        this.vocabCache.set(id, vocab);
        return vocab;
    }

    static async loadSentences(vocabId: string): Promise<import('../models/sentence.model').Sentence[] | null> {
        try {
            return await this.fetchJson<import('../models/sentence.model').Sentence[]>(`/data/compiled/sentences/${vocabId}.json`);
            // The file contains an array of sentences directly, or is it a SentenceSet?
            // Based on previous inspection of build-sentences.ts, it generates an array of Sentences?
            // Wait, checking the file content will confirm.
        } catch (e) {
            // No sentences found for this vocab is a valid state
            return null;
        }
    }
}
