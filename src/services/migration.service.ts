import { CONSTANTS } from '../commons/constants';
import type { VocabProgress, SRSEntry } from '../models/vocabulary.model';
import type { UserProgress } from '../models/user.model';
import { DEFAULT_SRS_ENTRY, DEFAULT_VOCABULARY_PROGRESS } from '../models/vocabulary.model';

/**
 * Current data format version
 * Increment this when making breaking changes to the data structure
 */
const CURRENT_FORMAT_VERSION = 5;

/**
 * Migration service to handle data format upgrades
 * Ensures backward compatibility when upgrading the SRS system
 */
export class MigrationService {
    /**
     * Migrates a single vocab progress item from old format to new format
     * Handles conversion from mastery (0-100) to memoryStrength/interval system
     */
    static migrateVocabProgress(item: any): VocabProgress {
        // Check if item has the old 'mastery' field
        // If it does, we need to migrate regardless of whether reading/meaning exist
        const hasOldFormat = item.mastery !== undefined;

        if (!hasOldFormat) {
            // Already migrated (no mastery field), just ensure all fields are present
            return {
                ...DEFAULT_VOCABULARY_PROGRESS,
                ...item,
                reading: { ...DEFAULT_SRS_ENTRY, ...item.reading },
                meaning: { ...DEFAULT_SRS_ENTRY, ...item.meaning }
            };
        }

        // Old format detected - migrate from mastery to memoryStrength
        const mastery = item.mastery ?? 0;
        const maxMemoryStrength = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

        // Convert mastery (0-100) to memoryStrength using CUBIC POWER FORMULA
        // Formula: S = S_max * (mastery / 100)^3
        // This maps 15% mastery -> ~4.3 days (instead of linear ~190 days)
        // This maps 100% mastery -> 1270 days (full mastery)
        const normalizedMastery = Math.max(0, Math.min(mastery, 100)) / 100;
        const memoryStrength = maxMemoryStrength * Math.pow(normalizedMastery, 3);

        // Calculate interval based on memory strength
        // Using the same formula as in SRS service: interval = S * ln(targetRecall) / ln(0.5)
        const targetRecall = CONSTANTS.srs.formula.targetRecall;
        const interval = memoryStrength * Math.log(targetRecall) / Math.log(0.5);

        // Clamp interval to valid range
        const clampedInterval = Math.max(
            CONSTANTS.srs.formula.minInterval,
            Math.min(interval, CONSTANTS.srs.formula.maxInterval)
        );

        // Create migrated SRSEntry
        const migratedEntry: SRSEntry = {
            memoryStrength,
            interval: clampedInterval,
            difficulty: 0.3, // Default difficulty
            lastReviewedAt: item.lastReviewedAt || null,
            dueDate: item.nextReviewAt || null,
            history: []
        };

        // Build migrated vocab progress (without mastery field)
        // IMPORTANT: We do NOT remove the 'mastery' field anymore.
        // It is preserved for future reference if needed.

        return {
            ...DEFAULT_VOCABULARY_PROGRESS,
            ...item, // Keep all original fields including mastery
            reading: { ...migratedEntry },
            meaning: { ...DEFAULT_SRS_ENTRY } // Meaning starts fresh
        };
    }

    /**
     * Migrates entire user progress from old format to new format
     * Adds format version tracking
     */
    /**
     * Migrates base progress
     */
    static migrateUserProgress(progress: any): UserProgress {
        const currentVersion = progress._formatVersion ?? 0;

        // V1 to V3 Migrations
        let migratedQueue = progress.learningQueue ?? [];
        if (currentVersion < 3) {
            migratedQueue = migratedQueue.map((item: any) => this.migrateVocabProgress(item));

            migratedQueue = migratedQueue.map((item: VocabProgress) => {
                if (item.stage === 'learning' && !item.meaning.dueDate && item.meaning.interval === 0) {
                    return {
                        ...item,
                        meaning: {
                            ...item.meaning,
                            dueDate: new Date().toISOString()
                        }
                    };
                }
                return item;
            });
        }

        // Return V3 (V4 requires async fetch, handled by QuizContext)
        // If it's already V4, we just return it as is.
        return {
            ...progress,
            learningQueue: migratedQueue,
            adaptive: progress.adaptive ?? { level: 1.0, history: [] },
            _formatVersion: currentVersion < CURRENT_FORMAT_VERSION ? 3 : currentVersion // Max sync version is 3
        };
    }

    /**
     * V4/V5 Migration (Async) - Merges homograph vocabularies
     * Upgraded to V5 to re-trigger for users who loaded when the map was empty due to a build bug.
     */
    static async migrateMergedVocabsAsync(progress: UserProgress): Promise<UserProgress> {
        const currentVersion = progress._formatVersion ?? 0;
        if (currentVersion >= CURRENT_FORMAT_VERSION) return progress;

        try {
            // Fetch the map generated by the build script (with cache-busting)
            const res = await fetch(`/data/compiled/index/merged-map.json?t=${Date.now()}`);
            if (!res.ok) throw new Error("Could not fetch merged map");
            const mergedMap: Record<string, string> = await res.json();

            // Group by the target (new) ID
            const queueMap = new Map<string, VocabProgress[]>();

            for (const item of progress.learningQueue) {
                const targetId = mergedMap[item.vocabId] || item.vocabId;
                if (!queueMap.has(targetId)) queueMap.set(targetId, []);
                queueMap.get(targetId)!.push(item);
            }

            const updatedQueue: VocabProgress[] = [];

            for (const [targetId, items] of queueMap.entries()) {
                if (items.length === 1) {
                    // Update ID if it changed
                    updatedQueue.push({ ...items[0], vocabId: targetId });
                } else {
                    // We have duplicates to merge!
                    const baseItem = { ...items[0], vocabId: targetId };

                    // Merge properties
                    let totalReviews = 0;
                    let consecutiveFailures = 0;
                    let maxReadingStrength = 0;
                    let maxReadingInterval = 0;
                    let maxMeaningStrength = 0;
                    let maxMeaningInterval = 0;
                    let allReadingHistory: any[] = [];
                    let allMeaningHistory: any[] = [];

                    let earliestIntro = items[0].introductionAt;

                    for (const item of items) {
                        totalReviews += item.totalReviews;
                        consecutiveFailures = Math.max(consecutiveFailures, item.consecutiveFailures);

                        maxReadingStrength = Math.max(maxReadingStrength, item.reading.memoryStrength);
                        maxReadingInterval = Math.max(maxReadingInterval, item.reading.interval);

                        maxMeaningStrength = Math.max(maxMeaningStrength, item.meaning.memoryStrength);
                        maxMeaningInterval = Math.max(maxMeaningInterval, item.meaning.interval);

                        allReadingHistory.push(...item.reading.history);
                        allMeaningHistory.push(...item.meaning.history);

                        if (item.introductionAt && (!earliestIntro || new Date(item.introductionAt) < new Date(earliestIntro))) {
                            earliestIntro = item.introductionAt;
                        }
                    }

                    // Sort histories
                    allReadingHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    allMeaningHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    // Determine stage (if any graduated, it's graduated)
                    const isGraduated = items.some(i => i.stage === 'graduated');

                    // Determine due date (closest due date)
                    let closestReadingDue = items.map(i => i.reading.dueDate).filter(Boolean).sort()[0] || null;
                    let closestMeaningDue = items.map(i => i.meaning.dueDate).filter(Boolean).sort()[0] || null;

                    baseItem.totalReviews = totalReviews;
                    baseItem.consecutiveFailures = consecutiveFailures;
                    baseItem.introductionAt = earliestIntro;
                    baseItem.stage = isGraduated ? 'graduated' : 'learning';

                    baseItem.reading = {
                        ...baseItem.reading,
                        memoryStrength: maxReadingStrength,
                        interval: maxReadingInterval,
                        dueDate: closestReadingDue as any,
                        history: allReadingHistory
                    };

                    baseItem.meaning = {
                        ...baseItem.meaning,
                        memoryStrength: maxMeaningStrength,
                        interval: maxMeaningInterval,
                        dueDate: closestMeaningDue as any,
                        history: allMeaningHistory
                    };

                    updatedQueue.push(baseItem);
                }
            }

            return {
                ...progress,
                learningQueue: updatedQueue,
                _formatVersion: CURRENT_FORMAT_VERSION
            };

        } catch (e) {
            console.error("Failed to migrate to merged vocabs:", e);
            return progress; // Fallback without migration if fetch fails
        }
    }

    /**
     * Check if data needs migration
     */
    static needsMigration(progress: any): boolean {
        const currentVersion = progress._formatVersion ?? 0;
        return currentVersion < CURRENT_FORMAT_VERSION;
    }
}
