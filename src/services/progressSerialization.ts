import type { UserProgress } from "../models/user.model";
import type { VocabProgress } from "../models/vocabulary.model";
import { DEFAULT_VOCABULARY_PROGRESS } from "../models/vocabulary.model";
import { DEFAULT_PROGRESS } from "../models/user.model";
import { MigrationService } from "./migration.service";

/**
 * Single source of truth for progress (de)serialization, shared by localStorage
 * persistence and Google Drive sync so a stored payload always hydrates into the
 * exact same in-memory shape regardless of which channel it came from.
 */

/** JSON-safe plain object: Sets become arrays, Dates become ISO strings (via JSON.stringify). */
export function toPlainProgressJSON(progress: UserProgress): any {
    return JSON.parse(JSON.stringify(progress, (_key, value) => (value instanceof Set ? [...value] : value)));
}

/** Hydrates a raw parsed-JSON progress object (already migrated) into a UserProgress with real Dates/Sets. */
export function hydrateProgress(migrated: any): UserProgress {
    const learningQueue: VocabProgress[] = (migrated.learningQueue ?? []).map((elem: any) => ({
        ...DEFAULT_VOCABULARY_PROGRESS,
        ...elem,
        nextReviewAt: hydrateDate(elem.nextReviewAt),
        lastReviewedAt: hydrateDate(elem.lastReviewedAt),
        introductionAt: hydrateDate(elem.introductionAt),
        reading: {
            ...elem.reading,
            lastReviewedAt: hydrateDate(elem.reading?.lastReviewedAt),
            dueDate: hydrateDate(elem.reading?.dueDate),
        },
        meaning: {
            ...elem.meaning,
            lastReviewedAt: hydrateDate(elem.meaning?.lastReviewedAt),
            dueDate: hydrateDate(elem.meaning?.dueDate),
        },
    }));

    return {
        ...DEFAULT_PROGRESS,
        ...migrated,
        kanjiKnowledge: {
            ...migrated.kanjiKnowledge,
            kanjiSet: new Set(migrated.kanjiKnowledge?.kanjiSet ?? []),
        },
        learningQueue,
    };
}

/** Runs migration then hydration - the full raw-JSON -> UserProgress pipeline. */
export function migrateAndHydrateProgress(parsed: any): UserProgress {
    const migrated = MigrationService.migrateUserProgress(parsed);
    return hydrateProgress(migrated);
}

/**
 * Accepts a Date, an ISO date string, null, or undefined - always returns a real
 * Date or null. Unlike a plain truthy check, this never silently swallows a
 * value that is already a Date instance.
 */
function hydrateDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    return null;
}
