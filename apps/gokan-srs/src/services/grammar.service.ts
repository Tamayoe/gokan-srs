import type { GrammarJlptIndex, GrammarPoint } from '../models/grammar.model';

/**
 * Loads grammar data compiled by scripts/build-grammar.ts into
 * public/data/grammar/. Mirrors VocabularyService's loading pattern (fetch +
 * in-memory cache), but this data is owned by gokan-srs itself rather than
 * synced from the gokan-dataset submodule - see CLAUDE.md's Grammar section.
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

        this.jlptIndex = await this.fetchJson<GrammarJlptIndex>(`/data/grammar/index/jlpt.json?v=${Date.now()}`);
        return this.jlptIndex;
    }

    static async loadGrammarPoint(id: string): Promise<GrammarPoint> {
        if (this.pointCache.has(id)) {
            return this.pointCache.get(id)!;
        }

        const point = await this.fetchJson<GrammarPoint>(`/data/grammar/points/${id}.json`);
        this.pointCache.set(id, point);
        return point;
    }
}
