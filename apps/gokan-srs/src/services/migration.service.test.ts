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

        it('recomputes nextReviewAt respecting enableMeaningQuiz (regression: sync-loop oscillation)', () => {
            // Root cause of the infinite auto-upload loop: the migration pass
            // recomputed nextReviewAt WITHOUT settings (=> meaning treated as
            // enabled), while mergeVocabProgress recomputed WITH settings, so the
            // derived value flipped on every load->merge round trip.
            const progress = {
                _formatVersion: 7,
                kanjiKnowledge: { method: 'kklc', step: 1, kanjiSet: [] },
                learningQueue: [
                    {
                        vocabId: 'vocab-osc',
                        stage: 'learning',
                        introductionAt: '2026-01-01T00:00:00.000Z',
                        nextReviewAt: null,
                        totalReviews: 2,
                        consecutiveFailures: 0,
                        reading: { memoryStrength: 250, interval: 72, difficulty: 0.31, lastReviewedAt: '2026-01-31T00:00:00.000Z', dueDate: '2026-07-24T00:00:00.000Z', history: [] },
                        meaning: { memoryStrength: 1, interval: 0, difficulty: 0.3, lastReviewedAt: null, dueDate: '2026-07-19T00:00:00.000Z', history: [] },
                    },
                ],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
                adaptive: { level: 1.0, history: [] },
            };

            // Meaning quizzes disabled: only the reading due date is authoritative.
            const disabled = MigrationService.migrateUserProgress(structuredClone(progress) as any, { enableMeaningQuiz: false });
            expect(disabled.learningQueue[0].nextReviewAt).toBe('2026-07-24T00:00:00.000Z' as any);

            // Meaning quizzes enabled: the earlier meaning due date wins.
            const enabled = MigrationService.migrateUserProgress(structuredClone(progress) as any, { enableMeaningQuiz: true });
            expect(enabled.learningQueue[0].nextReviewAt).toBe('2026-07-19T00:00:00.000Z' as any);
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

    describe('needsRetry normalization (boolean -> per-type object)', () => {
        it('converts a legacy true boolean to {reading: true}', () => {
            const item: any = { vocabId: 'v1', totalReviews: 1, consecutiveFailures: 0, needsRetry: true };
            const migrated = MigrationService.migrateVocabProgress(item);
            expect(migrated.needsRetry).toEqual({ reading: true });
        });

        it('converts a legacy false boolean to undefined', () => {
            const item: any = { vocabId: 'v1', totalReviews: 1, consecutiveFailures: 0, needsRetry: false };
            const migrated = MigrationService.migrateVocabProgress(item);
            expect(migrated.needsRetry).toBeUndefined();
        });

        it('leaves an already-migrated per-type object untouched', () => {
            const item: any = { vocabId: 'v1', totalReviews: 1, consecutiveFailures: 0, needsRetry: { meaning: true } };
            const migrated = MigrationService.migrateVocabProgress(item);
            expect(migrated.needsRetry).toEqual({ meaning: true });
        });

        it('normalizes needsRetry at the whole-progress level regardless of format version', () => {
            // Simulates an already-current-version user (V7) whose stored data still
            // has the legacy boolean shape - migrateVocabProgress's V1-V3 gate would
            // never touch this item, so migrateUserProgress must normalize unconditionally.
            const progress: any = {
                _formatVersion: 7,
                kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: [] },
                learningQueue: [
                    {
                        vocabId: 'already-current',
                        stage: 'learning',
                        totalReviews: 5,
                        consecutiveFailures: 0,
                        needsRetry: true,
                        reading: { memoryStrength: 50, interval: 10, difficulty: 0.3, lastReviewedAt: null, dueDate: null, history: [] },
                        meaning: { memoryStrength: 20, interval: 5, difficulty: 0.3, lastReviewedAt: null, dueDate: null, history: [] },
                    },
                ],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
            };

            const migrated = MigrationService.migrateUserProgress(progress);
            expect(migrated.learningQueue[0].needsRetry).toEqual({ reading: true });
        });
    });

    describe('needsMigration', () => {
        it('should return true for old format (no version)', () => {
            const oldProgress = {
                learningQueue: []
            };

            expect(MigrationService.needsMigration(oldProgress)).toBe(true);
        });

        it('should return true at the sync-pass ceiling (7) - only the async pass reaches the terminal version', () => {
            // Regression guard: version 7 is SYNC_MIGRATION_VERSION, not the terminal
            // version. Previously both were the same constant, so the sync pass could
            // stamp the terminal version on its own and pre-empt the async
            // homograph-merge pass. needsMigration() must keep reporting true until
            // migrateMergedVocabsAsync has actually run.
            const currentProgress = {
                _formatVersion: 7,
                learningQueue: []
            };

            expect(MigrationService.needsMigration(currentProgress)).toBe(true);
        });

        it('should return false only at the true terminal version (8)', () => {
            const currentProgress = {
                _formatVersion: 8,
                learningQueue: []
            };

            expect(MigrationService.needsMigration(currentProgress)).toBe(false);
        });

        it('migrateUserProgress alone (the sync pass) never reaches a version where needsMigration reports false', () => {
            // The core regression test: previously migrateUserProgress jumped straight
            // to CURRENT_FORMAT_VERSION, so a single synchronous load would silently
            // skip the async merge forever. It must now always leave needsMigration() true.
            const oldProgress: any = { learningQueue: [], stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 }, dailyOverride: false };
            const migratedSync = MigrationService.migrateUserProgress(oldProgress);

            expect(migratedSync._formatVersion).toBe(7);
            expect(MigrationService.needsMigration(migratedSync)).toBe(true);
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

            expect(migrated._formatVersion).toBe(8); // terminal version - only the async pass reaches it
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

    describe('grammarQueue (additive field, no version gate needed)', () => {
        it('defaults to an empty array when absent from stored data', () => {
            const progress: any = {
                kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: [] },
                learningQueue: [],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
            };

            const migrated = MigrationService.migrateUserProgress(progress);
            expect(migrated.grammarQueue).toEqual([]);
        });

        it('fills in defaults for a partial GrammarProgress item', () => {
            const progress: any = {
                kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: [] },
                learningQueue: [],
                grammarQueue: [{ grammarId: 'n5-001', stage: 'learning', entry: { memoryStrength: 5, interval: 2, dueDate: '2026-06-01T00:00:00.000Z' } }],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
            };

            const migrated = MigrationService.migrateUserProgress(progress);
            expect(migrated.grammarQueue).toHaveLength(1);
            expect(migrated.grammarQueue[0].entry.difficulty).toBeDefined();
            expect(migrated.grammarQueue[0].nextReviewAt).toEqual('2026-06-01T00:00:00.000Z');
        });

        it('leaves a graduated grammar item nextReviewAt null rather than re-deriving from a stale dueDate', () => {
            const progress: any = {
                kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: [] },
                learningQueue: [],
                grammarQueue: [{
                    grammarId: 'n5-001',
                    stage: 'graduated',
                    nextReviewAt: null,
                    entry: { memoryStrength: CONSTANTS.srs.formula.mastery.maxMemoryStrength, interval: 3650, dueDate: '2026-01-01T00:00:00.000Z' },
                }],
                stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
                dailyOverride: false,
            };

            const migrated = MigrationService.migrateUserProgress(progress);
            expect(migrated.grammarQueue[0].nextReviewAt).toBeNull();
        });
    });
});
