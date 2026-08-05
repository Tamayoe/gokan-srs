import { describe, it, expect } from 'vitest';
import { isGrammarFullyMastered, grammarNextReviewAt, isGrammarDue } from './grammarScheduling';
import { CONSTANTS } from '../commons/constants';
import type { SRSEntry } from '../models/vocabulary.model';

const MAX = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

function makeEntry(overrides: Partial<SRSEntry> = {}): SRSEntry {
    return {
        memoryStrength: 10,
        interval: 5,
        difficulty: 0.3,
        lastReviewedAt: null,
        dueDate: null,
        history: [],
        ...overrides,
    };
}

describe('grammarScheduling', () => {
    describe('isGrammarFullyMastered', () => {
        it('is false below the mastery threshold', () => {
            expect(isGrammarFullyMastered({ entry: makeEntry({ memoryStrength: MAX - 1 }) })).toBe(false);
        });
        it('is true at or above the mastery threshold', () => {
            expect(isGrammarFullyMastered({ entry: makeEntry({ memoryStrength: MAX }) })).toBe(true);
        });
    });

    describe('grammarNextReviewAt', () => {
        it('returns the entry due date when not mastered', () => {
            const due = new Date('2026-06-05T00:00:00Z');
            expect(grammarNextReviewAt({ entry: makeEntry({ dueDate: due }) })).toEqual(due);
        });

        it('returns null once mastered, regardless of dueDate', () => {
            const due = new Date('2026-06-05T00:00:00Z');
            expect(grammarNextReviewAt({ entry: makeEntry({ memoryStrength: MAX, dueDate: due }) })).toBeNull();
        });
    });

    describe('isGrammarDue', () => {
        const now = new Date('2026-06-10T00:00:00Z');
        const past = new Date('2026-06-01T00:00:00Z');
        const future = new Date('2026-07-01T00:00:00Z');

        it('is false for graduated items regardless of due date', () => {
            expect(isGrammarDue({ stage: 'graduated', entry: makeEntry({ dueDate: past }) }, now)).toBe(false);
        });

        it('is true when due in the past', () => {
            expect(isGrammarDue({ stage: 'learning', entry: makeEntry({ dueDate: past }) }, now)).toBe(true);
        });

        it('is false when due in the future', () => {
            expect(isGrammarDue({ stage: 'learning', entry: makeEntry({ dueDate: future }) }, now)).toBe(false);
        });

        it('is false when there is no due date at all', () => {
            expect(isGrammarDue({ stage: 'learning', entry: makeEntry({ dueDate: null }) }, now)).toBe(false);
        });
    });
});
