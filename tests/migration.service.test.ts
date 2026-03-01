import { describe, it, expect } from 'vitest';
import { MigrationService } from '../packages/core/src/services/migration.service';
import { CONSTANTS } from '../packages/core/src/commons/constants';
import type { VocabProgress } from '../packages/core/src/models/vocabulary.model';

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
            // NEW Cubic Formula: S = S_max * (mastery/100)^3
            // 75% -> 0.75^3 = 0.421875
            // 0.421875 * 1270 = ~535
            const expectedStrength = maxMemoryStrength * Math.pow(0.75, 3);

            expect(migrated.reading.memoryStrength).toBeCloseTo(expectedStrength, 1);
            expect(migrated.reading.interval).toBeGreaterThan(0);
            expect(migrated.reading.difficulty).toBe(0.3);

            // Should PRESERVE mastery field
            expect((migrated as any).mastery).toBe(75);

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

            expect(migrated.reading.memoryStrength).toBe(CONSTANTS.srs.formula.minMemoryStrength);
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
            expect(migrated.reading.memoryStrength).toBeCloseTo(maxMemoryStrength * Math.pow(0.75, 3), 1);
            expect(migrated.reading.interval).toBeGreaterThan(0);

            // Should PRESERVE mastery field
            expect((migrated as any).mastery).toBe(75);

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
            expect(migrated._formatVersion).toBe(7);

            // Should migrate all items
            expect(migrated.learningQueue).toHaveLength(2);
            // 50% -> 0.5^3 = 0.125 * 1270 = ~158.75
            expect(migrated.learningQueue[0].reading.memoryStrength).toBeCloseTo(maxMemoryStrength * Math.pow(0.5, 3), 1);
            // 75% -> 0.75^3 = 0.421875 * 1270 = ~535.78
            expect(migrated.learningQueue[1].reading.memoryStrength).toBeCloseTo(maxMemoryStrength * Math.pow(0.75, 3), 1);

            // Should preserve other fields
            expect(migrated.stats.totalReviews).toBe(100);
            expect(migrated.kanjiKnowledge.step).toBe(100);
        });

        it('should not re-migrate if already at current version or V3 sync cap', () => {
            const alreadyMigrated = {
                _formatVersion: 3,
                kanjiKnowledge: {
                    method: 'kklc', // Only partial check needed for types, casting if needed
                    step: 100,
                    kanjiSet: ['日']
                },
                learningQueue: [],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
                adaptive: { level: 1.0, history: [] }
            };

            // Cast to solve type issues in test
            const result = MigrationService.migrateUserProgress(alreadyMigrated as any);

            // Should return as-is (sync cap is 7)
            expect(result._formatVersion).toBe(7);
        });

        it('should migrate version 2 to version 3 (add adaptive stats AND init meaning)', () => {
            const v2Progress = {
                _formatVersion: 2,
                kanjiKnowledge: { method: 'kklc', step: 1, kanjiSet: [] },
                learningQueue: [
                    {
                        vocabId: 'existing-vocab',
                        stage: 'learning',
                        reading: { memoryStrength: 10, interval: 1, dueDate: '2026-02-01' },
                        meaning: { memoryStrength: 0, interval: 0, dueDate: null } // Fresh meaning
                    }
                ],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false
            };

            const result = MigrationService.migrateUserProgress(v2Progress);

            expect(result._formatVersion).toBe(7);

            // Adaptive check
            expect(result.adaptive).toBeDefined();
            expect(result.adaptive.level).toBe(1.0);

            // Meaning Init check
            const item = result.learningQueue[0];
            expect(item.meaning.dueDate).toBeTruthy(); // Should be set to date string
        });
    });

    describe('needsMigration', () => {
        it('should return true for old format (no version)', () => {
            const oldProgress = {
                learningQueue: []
            };

            expect(MigrationService.needsMigration(oldProgress)).toBe(true);
        });

        it('should return false for current version (7)', () => {
            const currentProgress = {
                _formatVersion: 7,
                learningQueue: []
            };

            expect(MigrationService.needsMigration(currentProgress)).toBe(false);
        });

        it('should return true for V3 version needing V5', () => {
            const currentProgress = {
                _formatVersion: 3,
                learningQueue: []
            };

            expect(MigrationService.needsMigration(currentProgress)).toBe(true);
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

            // Should PRESERVE mastery
            expect((migrated as any).mastery).toBe(75);
        });
    });

    describe('migrateMergedVocabsAsync V6 Deduplication', () => {
        it('should correctly deduplicate histories and use max totalReviews', async () => {
            // Mock fetch to return a simple map
            globalThis.fetch = async () => ({
                ok: true,
                json: async () => ({
                    'old-id-1': 'new-base-id',
                    'old-id-2': 'new-base-id'
                })
            }) as any;

            const duplicateProgress: any = {
                _formatVersion: 5,
                learningQueue: [
                    {
                        vocabId: 'old-id-1',
                        stage: 'learning',
                        totalReviews: 10,
                        consecutiveFailures: 0,
                        reading: {
                            memoryStrength: 100,
                            interval: 5,
                            dueDate: '2026-03-01T00:00:00Z',
                            history: [
                                { date: 1000, result: 'correct' },
                                { date: 2000, result: 'correct' }
                            ]
                        },
                        meaning: {
                            memoryStrength: 0, // This should be rescued
                            interval: 0,
                            dueDate: null,
                            history: []
                        }
                    },
                    {
                        vocabId: 'old-id-2', // This simulates a duplicated sync clone
                        stage: 'learning',
                        totalReviews: 10, // Same reviews
                        consecutiveFailures: 0,
                        reading: {
                            memoryStrength: 100,
                            interval: 5,
                            dueDate: '2026-03-01T00:00:00Z', // Same due date
                            history: [
                                { date: 1000, result: 'correct' }, // Duplicated history
                                { date: 2000, result: 'correct' },
                                { date: 3000, result: 'correct' }  // One extra review
                            ]
                        },
                        meaning: {
                            memoryStrength: 0, // This should be rescued
                            interval: 0,
                            dueDate: null,
                            history: []
                        }
                    }
                ]
            };

            const migrated = await MigrationService.migrateMergedVocabsAsync(duplicateProgress);

            expect(migrated._formatVersion).toBe(7);
            expect(migrated.learningQueue).toHaveLength(1); // Properly merged

            const mergedItem = migrated.learningQueue[0];
            expect(mergedItem.vocabId).toBe('new-base-id');
            expect(mergedItem.totalReviews).toBe(10); // NOT 20

            // History should be deduplicated (only 3 items, not 5)
            expect(mergedItem.reading.history).toHaveLength(3);
            expect(mergedItem.reading.history[0].date).toBe(1000);
            expect(mergedItem.reading.history[1].date).toBe(2000);
            expect(mergedItem.reading.history[2].date).toBe(3000);

            // 0 memory strength rescue check
            expect(mergedItem.meaning.memoryStrength).toBe(CONSTANTS.srs.formula.minMemoryStrength);
        });
    });
});
