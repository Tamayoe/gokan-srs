import { describe, it, expect } from 'vitest';
import { MigrationService } from './migration.service';
import { CONSTANTS } from '../commons/constants';
import type { VocabProgress } from '../models/vocabulary.model';

describe('MigrationService', () => {
    const maxMemoryStrength = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

    describe('migrateVocabProgress', () => {
        it('should migrate old format (mastery only) to new format', () => {
            const oldFormat = {
                vocabId: 'test-123',
                stage: 'learning',
                mastery: 75,
                introductionAt: '2026-01-20T00:00:00Z',
                nextReviewAt: '2026-01-25T00:00:00Z',
                lastReviewedAt: '2026-01-24T00:00:00Z',
                totalReviews: 5,
                consecutiveFailures: 0
            };

            const migrated = MigrationService.migrateVocabProgress(oldFormat);

            // Should have reading SRSEntry with converted memoryStrength
            expect(migrated.reading.memoryStrength).toBeCloseTo((75 / 100) * maxMemoryStrength, 1);
            expect(migrated.reading.interval).toBeGreaterThan(0);
            expect(migrated.reading.difficulty).toBe(0.3);

            // Should not have mastery field
            expect((migrated as any).mastery).toBeUndefined();

            // Should preserve other fields
            expect(migrated.vocabId).toBe('test-123');
            expect(migrated.totalReviews).toBe(5);
            expect(migrated.consecutiveFailures).toBe(0);
        });

        it('should handle mastery 0 (beginner)', () => {
            const oldFormat = {
                vocabId: 'test-123',
                mastery: 0,
                totalReviews: 0,
                consecutiveFailures: 0
            };

            const migrated = MigrationService.migrateVocabProgress(oldFormat);

            expect(migrated.reading.memoryStrength).toBe(0);
            expect(migrated.reading.interval).toBeGreaterThanOrEqual(CONSTANTS.srs.formula.minInterval);
        });

        it('should handle mastery 100 (mastered)', () => {
            const oldFormat = {
                vocabId: 'test-123',
                mastery: 100,
                totalReviews: 10,
                consecutiveFailures: 0
            };

            const migrated = MigrationService.migrateVocabProgress(oldFormat);

            expect(migrated.reading.memoryStrength).toBeCloseTo(maxMemoryStrength, 1);
            expect(migrated.reading.interval).toBeGreaterThan(100); // Should have long interval
        });

        it('should not re-migrate already migrated data', () => {
            const alreadyMigrated: VocabProgress = {
                vocabId: 'test-123',
                stage: 'learning',
                introductionAt: null,
                nextReviewAt: null,
                lastReviewedAt: null,
                totalReviews: 5,
                consecutiveFailures: 0,
                reading: {
                    memoryStrength: 500,
                    interval: 50,
                    difficulty: 0.4,
                    lastReviewedAt: null,
                    dueDate: null,
                    history: []
                },
                meaning: {
                    memoryStrength: 0,
                    interval: 0,
                    difficulty: 0.3,
                    lastReviewedAt: null,
                    dueDate: null,
                    history: []
                }
            };

            const result = MigrationService.migrateVocabProgress(alreadyMigrated);

            // Should preserve existing values
            expect(result.reading.memoryStrength).toBe(500);
            expect(result.reading.interval).toBe(50);
            expect(result.reading.difficulty).toBe(0.4);
        });

        it('should set dueDate from nextReviewAt', () => {
            const oldFormat = {
                vocabId: 'test-123',
                mastery: 60,
                nextReviewAt: '2026-02-01T12:00:00Z',
                totalReviews: 3,
                consecutiveFailures: 0
            };

            const migrated = MigrationService.migrateVocabProgress(oldFormat);

            expect(migrated.reading.dueDate).toBe('2026-02-01T12:00:00Z');
        });

        it('should migrate data that has both mastery and reading/meaning fields with zero values', () => {
            // This is the bug case - old data that has both mastery and reading/meaning
            // with default/zero values should still be migrated
            const mixedFormat = {
                vocabId: 'test-123',
                stage: 'learning',
                mastery: 75,
                introductionAt: '2026-01-17T20:35:14.738Z',
                nextReviewAt: '2026-01-18T23:08:48.846Z',
                lastReviewedAt: '2026-01-17T20:35:23.055Z',
                totalReviews: 1,
                consecutiveFailures: 0,
                reading: {
                    memoryStrength: 0,
                    interval: 0,
                    difficulty: 0.3,
                    lastReviewedAt: null,
                    dueDate: null,
                    history: []
                },
                meaning: {
                    memoryStrength: 0,
                    interval: 0,
                    difficulty: 0.3,
                    lastReviewedAt: null,
                    dueDate: null,
                    history: []
                }
            };

            const migrated = MigrationService.migrateVocabProgress(mixedFormat);

            // Should have converted mastery to memoryStrength
            expect(migrated.reading.memoryStrength).toBeCloseTo((75 / 100) * maxMemoryStrength, 1);
            expect(migrated.reading.interval).toBeGreaterThan(0);

            // Should not have mastery field
            expect((migrated as any).mastery).toBeUndefined();

            // Should preserve other fields
            expect(migrated.totalReviews).toBe(1);
            expect(migrated.reading.dueDate).toBe('2026-01-18T23:08:48.846Z');
        });
    });

    describe('migrateUserProgress', () => {
        it('should migrate entire learning queue', () => {
            const oldProgress = {
                kanjiKnowledge: {
                    method: 'kklc',
                    step: 100,
                    kanjiSet: ['日', '月', '火']
                },
                learningQueue: [
                    {
                        vocabId: 'vocab-1',
                        mastery: 50,
                        totalReviews: 3,
                        consecutiveFailures: 0
                    },
                    {
                        vocabId: 'vocab-2',
                        mastery: 75,
                        totalReviews: 5,
                        consecutiveFailures: 0
                    }
                ],
                stats: {
                    newLearnedToday: 5,
                    totalLearned: 50,
                    totalReviews: 100
                },
                dailyOverride: false
            };

            const migrated = MigrationService.migrateUserProgress(oldProgress);

            // Should have format version
            expect(migrated._formatVersion).toBe(1);

            // Should migrate all items
            expect(migrated.learningQueue).toHaveLength(2);
            expect(migrated.learningQueue[0].reading.memoryStrength).toBeCloseTo((50 / 100) * maxMemoryStrength, 1);
            expect(migrated.learningQueue[1].reading.memoryStrength).toBeCloseTo((75 / 100) * maxMemoryStrength, 1);

            // Should preserve other fields
            expect(migrated.stats.totalReviews).toBe(100);
            expect(migrated.kanjiKnowledge.step).toBe(100);
        });

        it('should not re-migrate if already at current version', () => {
            const alreadyMigrated = {
                _formatVersion: 1,
                kanjiKnowledge: {
                    method: 'kklc',
                    step: 100,
                    kanjiSet: ['日']
                },
                learningQueue: [
                    {
                        vocabId: 'vocab-1',
                        reading: {
                            memoryStrength: 500,
                            interval: 50,
                            difficulty: 0.3,
                            lastReviewedAt: null,
                            dueDate: null,
                            history: []
                        },
                        meaning: {
                            memoryStrength: 0,
                            interval: 0,
                            difficulty: 0.3,
                            lastReviewedAt: null,
                            dueDate: null,
                            history: []
                        },
                        totalReviews: 5,
                        consecutiveFailures: 0
                    }
                ],
                stats: {
                    newLearnedToday: 0,
                    totalLearned: 0,
                    totalReviews: 0
                },
                dailyOverride: false
            };

            const result = MigrationService.migrateUserProgress(alreadyMigrated);

            // Should return as-is
            expect(result._formatVersion).toBe(1);
            expect(result.learningQueue[0].reading.memoryStrength).toBe(500);
        });
    });

    describe('needsMigration', () => {
        it('should return true for old format (no version)', () => {
            const oldProgress = {
                learningQueue: []
            };

            expect(MigrationService.needsMigration(oldProgress)).toBe(true);
        });

        it('should return false for current version', () => {
            const currentProgress = {
                _formatVersion: 1,
                learningQueue: []
            };

            expect(MigrationService.needsMigration(currentProgress)).toBe(false);
        });
    });

    describe('Real Production Data Sample', () => {
        it('should successfully migrate a sample from production data', () => {
            // Sample from actual kanji-progress.json
            const productionSample = {
                vocabId: '1375610',
                stage: 'learning',
                mastery: 75,
                introductionAt: '2026-01-17T16:05:40.828Z',
                nextReviewAt: '2026-02-09T13:25:07.640Z',
                lastReviewedAt: '2026-01-27T23:47:24.343Z',
                totalReviews: 5,
                consecutiveFailures: 0
            };

            const migrated = MigrationService.migrateVocabProgress(productionSample);

            // Should have valid SRS data
            expect(migrated.reading.memoryStrength).toBeGreaterThan(0);
            expect(migrated.reading.interval).toBeGreaterThan(0);
            expect(migrated.reading.dueDate).toBe('2026-02-09T13:25:07.640Z');

            // Should preserve review history
            expect(migrated.totalReviews).toBe(5);
            expect(migrated.lastReviewedAt).toBe('2026-01-27T23:47:24.343Z');

            // Should not have mastery
            expect((migrated as any).mastery).toBeUndefined();
        });
    });
});
