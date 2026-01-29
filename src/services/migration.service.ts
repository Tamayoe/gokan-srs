import { CONSTANTS } from '../commons/constants';
import type { VocabProgress, SRSEntry } from '../models/vocabulary.model';
import type { UserProgress } from '../models/user.model';
import { DEFAULT_SRS_ENTRY, DEFAULT_VOCABULARY_PROGRESS } from '../models/vocabulary.model';

/**
 * Current data format version
 * Increment this when making breaking changes to the data structure
 */
const CURRENT_FORMAT_VERSION = 2;

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
    static migrateUserProgress(progress: any): UserProgress {
        // Check if already migrated
        const currentVersion = progress._formatVersion ?? 0;

        if (currentVersion >= CURRENT_FORMAT_VERSION) {
            // Already at current version, no migration needed
            return progress as UserProgress;
        }

        // Migrate each vocab progress item
        const migratedQueue = progress.learningQueue?.map((item: any) =>
            this.migrateVocabProgress(item)
        ) ?? [];

        // Return migrated progress with version metadata
        return {
            ...progress,
            learningQueue: migratedQueue,
            _formatVersion: CURRENT_FORMAT_VERSION
        };
    }

    /**
     * Check if data needs migration
     */
    static needsMigration(progress: any): boolean {
        const currentVersion = progress._formatVersion ?? 0;
        return currentVersion < CURRENT_FORMAT_VERSION;
    }
}
