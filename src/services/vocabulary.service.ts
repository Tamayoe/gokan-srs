// src/services/VocabularyLoader.ts
import type { Vocabulary } from '../models/vocabulary.model';
import type {FrequencyIndex, KKLCIndex, KKLCKanjiIndex} from '../models/index.model';

export class VocabularyService {
    private static kklcIndex: KKLCIndex | null = null;
    private static kklcKanjiIndex: KKLCKanjiIndex | null = null;
    private static frequencyIndex: FrequencyIndex | null = null;
    private static vocabCache = new Map<string, Vocabulary>();

    static async loadKKLCKanjiIndex(): Promise<KKLCKanjiIndex | null> {
        if (this.kklcKanjiIndex) return this.kklcKanjiIndex;

        const mod = await import('../../data/compiled/index/kklc-kanji.json');
        this.kklcKanjiIndex = mod.default;
        return this.kklcKanjiIndex;
    }

    static async loadKKLCIndex(): Promise<KKLCIndex | null> {
        if (this.kklcIndex) return this.kklcIndex;

        const mod = await import('../../data/compiled/index/kklc.json');
        this.kklcIndex = mod.default;
        return this.kklcIndex;
    }

    static async loadFrequencyIndex(): Promise<FrequencyIndex | null> {
        if (this.frequencyIndex) return this.frequencyIndex;

        const mod = await import('../../data/compiled/index/frequency.json');
        this.frequencyIndex = mod.default as FrequencyIndex | null;
        return this.frequencyIndex;
    }

    static async loadVocab(id: string): Promise<Vocabulary> {
        if (this.vocabCache.has(id)) {
            return this.vocabCache.get(id)!;
        }

        const mod = await import(`../../data/compiled/vocab/${id}.json`);
        this.vocabCache.set(id, mod.default);
        return mod.default;
    }
}
