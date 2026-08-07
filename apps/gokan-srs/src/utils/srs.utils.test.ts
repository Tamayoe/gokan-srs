import { describe, it, expect } from 'vitest';
import { clearStaleNeedsRetry } from './srs.utils';
import { DEFAULT_SRS_ENTRY } from '../models/vocabulary.model';
import type { VocabProgress } from '../models/vocabulary.model';
import type { UserSettings } from '../models/user.model';

const now = new Date('2026-06-10T00:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');
const future = new Date('2026-07-01T00:00:00Z');

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
    return {
        preferredLearningOrder: 'frequency',
        kanjiCoverageTarget: 1,
        enableMeaningQuiz: true,
        learningFrequency: 'medium',
        ...overrides,
    } as UserSettings;
}

// Fully self-contained (no shared nested objects) - see quizSelectors.test.ts's note
// on DEFAULT_VOCABULARY_PROGRESS's shared reading/meaning objects being a test-hygiene hazard.
function makeVocabProgress(overrides: Partial<VocabProgress> = {}): VocabProgress {
    return {
        vocabId: 'v1',
        stage: 'learning',
        introductionAt: past,
        nextReviewAt: null,
        lastReviewedAt: null,
        totalReviews: 1,
        consecutiveFailures: 0,
        reading: { ...DEFAULT_SRS_ENTRY },
        meaning: { ...DEFAULT_SRS_ENTRY },
        ...overrides,
    };
}

describe('clearStaleNeedsRetry', () => {
    // issue #36: a needsRetry flag inherited from a previous session, colliding
    // with that same quiz type's regular due review, should be cleared rather
    // than surfacing a second, redundant retry prompt for the same item.

    it('clears a stale reading needsRetry flag when the reading is also regularly due', () => {
        const v = makeVocabProgress({
            needsRetry: { reading: true },
            reading: { ...DEFAULT_SRS_ENTRY, dueDate: past },
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry?.reading).toBe(false);
    });

    it('clears a stale meaning needsRetry flag when the meaning is also regularly due', () => {
        const v = makeVocabProgress({
            needsRetry: { meaning: true },
            meaning: { ...DEFAULT_SRS_ENTRY, dueDate: past },
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry?.meaning).toBe(false);
    });

    it('clears reading and meaning independently in the same call', () => {
        const v = makeVocabProgress({
            needsRetry: { reading: true, meaning: true },
            reading: { ...DEFAULT_SRS_ENTRY, dueDate: past },
            meaning: { ...DEFAULT_SRS_ENTRY, dueDate: null }, // meaning not due - stays
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry?.reading).toBe(false);
        expect(result.needsRetry?.meaning).toBe(true);
    });

    it('leaves needsRetry untouched when the regular review is not yet due (same-session retry)', () => {
        const v = makeVocabProgress({
            needsRetry: { reading: true },
            reading: { ...DEFAULT_SRS_ENTRY, dueDate: future },
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry?.reading).toBe(true);
    });

    it('leaves needsRetry untouched when totalReviews is 0 (no regular review has happened yet)', () => {
        const v = makeVocabProgress({
            needsRetry: { reading: true },
            totalReviews: 0,
            reading: { ...DEFAULT_SRS_ENTRY, dueDate: past },
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry?.reading).toBe(true);
    });

    it('does not clear a stale meaning flag when meaning quizzes are disabled', () => {
        const v = makeVocabProgress({
            needsRetry: { meaning: true },
            meaning: { ...DEFAULT_SRS_ENTRY, dueDate: past },
        });
        const [result] = clearStaleNeedsRetry([v], makeSettings({ enableMeaningQuiz: false }), now);
        expect(result.needsRetry?.meaning).toBe(true);
    });

    it('is a no-op for items without a needsRetry flag', () => {
        const v = makeVocabProgress({ reading: { ...DEFAULT_SRS_ENTRY, dueDate: past } });
        const [result] = clearStaleNeedsRetry([v], makeSettings(), now);
        expect(result.needsRetry).toBeUndefined();
    });

    it('returns the exact same array reference when nothing changed (avoids spurious progress updates)', () => {
        const queue = [makeVocabProgress({
            needsRetry: { reading: true },
            reading: { ...DEFAULT_SRS_ENTRY, dueDate: future },
        })];
        expect(clearStaleNeedsRetry(queue, makeSettings(), now)).toBe(queue);
    });

    it('handles an empty queue', () => {
        expect(clearStaleNeedsRetry([], makeSettings(), now)).toEqual([]);
    });
});
