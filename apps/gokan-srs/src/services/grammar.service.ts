import type { GrammarAliasIndex, GrammarChapter, GrammarJlptIndex, GrammarPoint, GrammarTeachingOrder } from '../models/grammar.model';

/**
 * Loads grammar data compiled by the gokan-dataset submodule's
 * scripts/build-grammar.ts into compiled/grammar/, synced into
 * public/data/compiled/grammar/ by sync-dataset.ts like every other dataset
 * (vocab, kanji, sentences). Mirrors VocabularyService's loading pattern
 * (fetch + in-memory cache) - see CLAUDE.md's Grammar section.
 */
export class GrammarService {
    private static jlptIndex: GrammarJlptIndex | null = null;
    private static teachingOrder: GrammarTeachingOrder | null = null;
    private static chapterByPointId: Map<string, GrammarChapter> | null = null;
    private static aliases: GrammarAliasIndex | null = null;
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

    /**
     * The dataset's authored introduction order (`index/teaching-order.json`).
     *
     * Returns null if the file can't be loaded, and callers fall back to the
     * JLPT index. That fallback is deliberately all-or-nothing: a PARTIAL order
     * silently resuming alphabetical mid-sequence would be invisible, whereas
     * "no order file at all, using the old behaviour" is at least a coherent
     * state. The dataset build already guarantees the file covers every point,
     * so a half-populated file shouldn't be reachable.
     */
    static async loadTeachingOrder(): Promise<GrammarTeachingOrder | null> {
        if (this.teachingOrder) return this.teachingOrder;

        try {
            const loaded = await this.fetchJson<GrammarTeachingOrder>(`/data/compiled/grammar/index/teaching-order.json?v=${Date.now()}`);
            if (!loaded?.order?.length || !loaded?.chapters?.length) return null;
            this.teachingOrder = loaded;
            return this.teachingOrder;
        } catch (e) {
            console.error('[GrammarService] Failed to load teaching order; falling back to JLPT order', e);
            return null;
        }
    }

    /** The chapter a point belongs to, or null when the order isn't available. */
    static async loadChapterFor(pointId: string): Promise<GrammarChapter | null> {
        const order = await this.loadTeachingOrder();
        if (!order) return null;

        if (!this.chapterByPointId) {
            this.chapterByPointId = new Map();
            for (const chapter of order.chapters) {
                for (const id of chapter.points) this.chapterByPointId.set(id, chapter);
            }
        }
        return this.chapterByPointId.get(pointId) ?? null;
    }

    /**
     * Dropped-duplicate id -> canonical id. Only used by the migration pass, so
     * a failure here must not be fatal: returning {} leaves stored progress
     * untouched rather than destroying it on a transient fetch error.
     */
    static async loadAliases(): Promise<GrammarAliasIndex> {
        if (this.aliases) return this.aliases;

        try {
            this.aliases = await this.fetchJson<GrammarAliasIndex>(`/data/compiled/grammar/index/aliases.json?v=${Date.now()}`);
            return this.aliases;
        } catch (e) {
            console.error('[GrammarService] Failed to load grammar aliases; skipping id migration this run', e);
            return {};
        }
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
