// src/services/VocabularyLoader.ts
import type { Vocabulary } from '../models/vocabulary.model';
import type { StepIndex } from '../models/index.model';

export class VocabularyService {
    private static kklcIndex: StepIndex | null = null;
    private static vocabCache = new Map<string, Vocabulary>();

    static async loadKKLCIndex(): Promise<StepIndex | null> {
        if (this.kklcIndex) return this.kklcIndex;

        const mod = await import('../../data/compiled/index/kklc.json');
        this.kklcIndex = mod.default;
        return this.kklcIndex;
    }

    static async loadVocab(id: string): Promise<Vocabulary> {
        if (this.vocabCache.has(id)) {
            return this.vocabCache.get(id)!;
        }

        const mod = await import(`../../data/compiled/vocab/${id}.json`);
        this.vocabCache.set(id, mod.default);
        return mod.default;
    }

    static async loadMany(ids: string[]): Promise<Vocabulary[]> {
        return Promise.all(ids.map(id => this.loadVocab(id)));
    }
}
