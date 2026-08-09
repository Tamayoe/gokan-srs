import { describe, it, expect, vi, afterEach } from 'vitest';
import { GrammarSRSService } from './grammarSrs.service';
import { GrammarService } from './grammar.service';
import { CONSTANTS } from '../commons/constants';
import type { GrammarProgress } from '../models/grammar.model';
import type { VocabProgress } from '../models/vocabulary.model';
import type { UserSettings } from '../models/user.model';

function makeProgress(overrides: Partial<GrammarProgress> = {}): GrammarProgress {
    return {
        grammarId: 'n5-001',
        stage: 'learning',
        introductionAt: new Date('2026-06-01T00:00:00Z'),
        nextReviewAt: null,
        lastReviewedAt: null,
        totalReviews: 0,
        consecutiveFailures: 0,
        entry: {
            memoryStrength: CONSTANTS.srs.formula.minMemoryStrength,
            interval: 0,
            difficulty: 0.5,
            lastReviewedAt: null,
            dueDate: null,
            history: [],
        },
        ...overrides,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GrammarSRSService.applyGrammarIntroChoice', () => {
    it('learn: sets nextReviewAt and entry.dueDate to now', () => {
        const fresh = GrammarSRSService.createGrammarProgress('n5-001');
        const updated = GrammarSRSService.applyGrammarIntroChoice(fresh, 'learn');

        expect(updated.introductionAt).not.toBeNull();
        expect(updated.nextReviewAt).not.toBeNull();
        expect(updated.entry.dueDate).toEqual(updated.nextReviewAt);
        expect(updated.stage).toBe('learning');
    });

    it('skip: graduates immediately at max memory strength', () => {
        const fresh = GrammarSRSService.createGrammarProgress('n5-001');
        const updated = GrammarSRSService.applyGrammarIntroChoice(fresh, 'skip');

        expect(updated.stage).toBe('graduated');
        expect(updated.nextReviewAt).toBeNull();
        expect(updated.entry.memoryStrength).toBe(CONSTANTS.srs.formula.mastery.maxMemoryStrength);
    });
});

describe('GrammarSRSService.applyAnswer', () => {
    const now = new Date('2026-06-10T00:00:00Z');

    it('updates the single SRS entry and increments totalReviews on a correct answer', () => {
        const progress = makeProgress({ entry: { ...makeProgress().entry, dueDate: now } });
        const { updated, result } = GrammarSRSService.applyAnswer(progress, 'correct', 5000, now);

        expect(result).toBe('correct');
        expect(updated.totalReviews).toBe(1);
        expect(updated.entry.memoryStrength).toBeGreaterThan(progress.entry.memoryStrength);
        expect(updated.needsRetry).toBe(false);
    });

    it('sets needsRetry on a wrong answer without prior retry state', () => {
        const progress = makeProgress();
        const { updated } = GrammarSRSService.applyAnswer(progress, 'wrong', 5000, now);

        expect(updated.needsRetry).toBe(true);
    });

    it('a pending retry does not update SRS state, only clears/keeps the flag', () => {
        const progress = makeProgress({ needsRetry: true });
        const { updated } = GrammarSRSService.applyAnswer(progress, 'correct', 5000, now);

        expect(updated.needsRetry).toBe(false);
        expect(updated.entry.memoryStrength).toBe(progress.entry.memoryStrength);
        expect(updated.totalReviews).toBe(progress.totalReviews);
    });

    it('graduates once the entry reaches max memory strength', () => {
        const progress = makeProgress({
            entry: { ...makeProgress().entry, memoryStrength: CONSTANTS.srs.formula.mastery.maxMemoryStrength - 0.001, dueDate: now },
        });
        const { updated } = GrammarSRSService.applyAnswer(progress, 'correct', 1000, now);

        expect(updated.stage).toBe('graduated');
        expect(updated.nextReviewAt).toBeNull();
    });

    it('a reduced strengthDeltaModifier earns a smaller (but still positive) gain than a full one', () => {
        const base = () => makeProgress({ entry: { ...makeProgress().entry, memoryStrength: 100, dueDate: now } });

        const full = GrammarSRSService.applyAnswer(base(), 'correct', 5000, now, 1.0, 1.0, 1.0).updated;
        const reduced = GrammarSRSService.applyAnswer(base(), 'correct', 5000, now, 1.0, 1.0, 0.5).updated;

        expect(full.entry.memoryStrength).toBeGreaterThan(100);
        expect(reduced.entry.memoryStrength).toBeGreaterThan(100);
        expect(reduced.entry.memoryStrength).toBeLessThan(full.entry.memoryStrength);
    });
});

describe('GrammarSRSService.applyVocabReinforcement (positive-only vocab credit)', () => {
    const now = new Date('2026-06-10T00:00:00Z');
    const settings = { learningFrequency: 'medium', enableMeaningQuiz: true } as UserSettings;

    function makeVocabProgress(overrides: Partial<VocabProgress> = {}): VocabProgress {
        const entry = () => ({
            memoryStrength: 100, interval: 1, difficulty: 0.5,
            lastReviewedAt: null, dueDate: now, history: [],
        });
        return {
            vocabId: 'v-1',
            stage: 'learning',
            introductionAt: new Date('2026-06-01T00:00:00Z'),
            nextReviewAt: now,
            lastReviewedAt: null,
            totalReviews: 1,
            consecutiveFailures: 0,
            reading: entry(),
            meaning: entry(),
            ...overrides,
        };
    }

    it('boosts the reading entry of a credited word and leaves untouched words alone', () => {
        const queue = [makeVocabProgress({ vocabId: 'v-1' }), makeVocabProgress({ vocabId: 'v-2' })];
        const next = GrammarSRSService.applyVocabReinforcement(queue, [{ vocabId: 'v-1', result: 'correct' }], now, settings);

        const v1 = next.find(v => v.vocabId === 'v-1')!;
        const v2 = next.find(v => v.vocabId === 'v-2')!;
        expect(v1.reading.memoryStrength).toBeGreaterThan(100);
        expect(v2).toBe(queue[1]); // reference-equal: untouched
    });

    it('never touches the meaning entry (reading-only credit)', () => {
        const queue = [makeVocabProgress({ vocabId: 'v-1' })];
        const next = GrammarSRSService.applyVocabReinforcement(queue, [{ vocabId: 'v-1', result: 'correct' }], now, settings);

        expect(next[0].meaning.memoryStrength).toBe(100);
    });

    it('returns the same queue reference when there are no credits', () => {
        const queue = [makeVocabProgress()];
        expect(GrammarSRSService.applyVocabReinforcement(queue, [], now, settings)).toBe(queue);
    });

    it('skips a credit whose word is not in the learning queue', () => {
        const queue = [makeVocabProgress({ vocabId: 'v-1' })];
        const next = GrammarSRSService.applyVocabReinforcement(queue, [{ vocabId: 'v-missing', result: 'correct' }], now, settings);
        expect(next).toBe(queue);
    });
});

describe('GrammarSRSService.deferWithoutCredit', () => {
    const now = new Date('2026-06-10T00:00:00Z');

    it('does not touch memoryStrength, interval, or difficulty', () => {
        const progress = makeProgress({ entry: { ...makeProgress().entry, memoryStrength: 42, interval: 7, difficulty: 0.6 } });
        const updated = GrammarSRSService.deferWithoutCredit(progress, now);

        expect(updated.entry.memoryStrength).toBe(42);
        expect(updated.entry.interval).toBe(7);
        expect(updated.entry.difficulty).toBe(0.6);
    });

    it('reschedules dueDate/nextReviewAt forward so the same ungradable card is not immediately re-served', () => {
        const progress = makeProgress({ entry: { ...makeProgress().entry, dueDate: now } });
        const updated = GrammarSRSService.deferWithoutCredit(progress, now);

        expect(updated.nextReviewAt).not.toBeNull();
        expect(updated.nextReviewAt!.getTime()).toBeGreaterThan(now.getTime());
        expect(updated.entry.dueDate!.getTime()).toBeGreaterThan(now.getTime());
    });

    it('still records lastReviewedAt and increments totalReviews for basic bookkeeping', () => {
        const progress = makeProgress({ totalReviews: 3 });
        const updated = GrammarSRSService.deferWithoutCredit(progress, now);

        expect(updated.lastReviewedAt).toEqual(now);
        expect(updated.totalReviews).toBe(4);
    });
});

describe('GrammarSRSService candidate finding (JLPT order)', () => {
    // 1 = N1 (hardest) .. 5 = N5 (easiest). Walk order must be N5 -> N1, mirroring vocab's findCandidatesJLPT.
    const mockIndex = {
        1: ['n1-a'],
        2: ['n2-a'],
        3: ['n3-a'],
        4: ['n4-a'],
        5: ['n5-a', 'n5-b'],
    };

    it('walks N5 -> N1', async () => {
        vi.spyOn(GrammarService, 'loadJlptIndex').mockResolvedValue(mockIndex);

        const candidates = await GrammarSRSService.getNextCandidates([], 6);

        expect(candidates).toEqual(['n5-a', 'n5-b', 'n4-a', 'n3-a', 'n2-a', 'n1-a']);
    });

    it('skips grammar points already in the queue', async () => {
        vi.spyOn(GrammarService, 'loadJlptIndex').mockResolvedValue(mockIndex);

        const currentQueue = [makeProgress({ grammarId: 'n5-a' }), makeProgress({ grammarId: 'n4-a' })];
        const candidates = await GrammarSRSService.getNextCandidates(currentQueue, 2);

        expect(candidates).toEqual(['n5-b', 'n3-a']);
    });

    it('respects the ignoredIds set (candidates already fetched this batch)', async () => {
        vi.spyOn(GrammarService, 'loadJlptIndex').mockResolvedValue(mockIndex);

        const candidates = await GrammarSRSService.getNextCandidates([], 2, new Set(['n5-a']));

        expect(candidates).toEqual(['n5-b', 'n4-a']);
    });

    it('countLearnableGrammar counts remaining grammar points not yet queued', async () => {
        vi.spyOn(GrammarService, 'loadJlptIndex').mockResolvedValue(mockIndex);

        const count = await GrammarSRSService.countLearnableGrammar([makeProgress({ grammarId: 'n5-a' })]);

        expect(count).toBe(5);
    });

    it('hasMoreLearnableGrammar is false once every grammar point is queued', async () => {
        vi.spyOn(GrammarService, 'loadJlptIndex').mockResolvedValue({ 1: [], 2: [], 3: [], 4: [], 5: [] });

        expect(await GrammarSRSService.hasMoreLearnableGrammar([])).toBe(false);
    });
});
