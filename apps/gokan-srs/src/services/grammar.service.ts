import type { GrammarJlptIndex, GrammarPoint } from '../models/grammar.model';

/**
 * Loads grammar data compiled by the gokan-dataset submodule's
 * scripts/build-grammar.ts into compiled/grammar/, synced into
 * public/data/compiled/grammar/ by sync-dataset.ts like every other dataset
 * (vocab, kanji, sentences). Mirrors VocabularyService's loading pattern
 * (fetch + in-memory cache) - see CLAUDE.md's Grammar section.
 */
export class GrammarService {
    private static jlptIndex: GrammarJlptIndex | null = null;
    private static pointCache = new Map<string, GrammarPoint>();

    private static async fetchJson<T>(path: string): Promise<T> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
        }
        return response.json();
    }

    static async loadJlptIndex(): Promise<GrammarJlptIndex | null> {
        if (this.jlptIndex) return this.jlptIndex;

        this.jlptIndex = await this.fetchJson<GrammarJlptIndex>(`/data/compiled/grammar/index/jlpt.json?v=${Date.now()}`);
        return this.jlptIndex;
    }

    static async loadGrammarPoint(id: string): Promise<GrammarPoint> {
        if (this.pointCache.has(id)) {
            return this.pointCache.get(id)!;
        }

        const point = await this.fetchJson<GrammarPoint>(`/data/compiled/grammar/points/${id}.json`);
        this.pointCache.set(id, point);
        return point;
    }
}
