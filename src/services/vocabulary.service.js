export class VocabularyService {
    static kklcIndex = null;
    static kklcKanjiIndex = null;
    static frequencyIndex = null;
    static vocabCache = new Map();
    static async loadKKLCKanjiIndex() {
        if (this.kklcKanjiIndex)
            return this.kklcKanjiIndex;
        const mod = await import('../../data/compiled/index/kklc-kanji.json');
        this.kklcKanjiIndex = mod.default;
        return this.kklcKanjiIndex;
    }
    static async loadKKLCIndex() {
        if (this.kklcIndex)
            return this.kklcIndex;
        const mod = await import('../../data/compiled/index/kklc.json');
        this.kklcIndex = mod.default;
        return this.kklcIndex;
    }
    static async loadFrequencyIndex() {
        if (this.frequencyIndex)
            return this.frequencyIndex;
        const mod = await import('../../data/compiled/index/frequency.json');
        this.frequencyIndex = mod.default;
        return this.frequencyIndex;
    }
    static async loadVocab(id) {
        if (this.vocabCache.has(id)) {
            return this.vocabCache.get(id);
        }
        const mod = await import(`../../data/compiled/vocab/${id}.json`);
        this.vocabCache.set(id, mod.default);
        return mod.default;
    }
}
