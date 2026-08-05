import { describe, it, expect } from 'vitest';
import {
    selectNextGrammarView,
    computeBlankPlan,
    selectCurrentGrammarProgress,
    selectNextGrammarSessionPreview,
} from './grammarSelectors';
import type { QuizState } from './quizReducer';
import type { UserProgress } from '../../models/user.model';
import type { GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import { DEFAULT_GRAMMAR_PROGRESS } from '../../models/grammar.model';
import type { VocabProgress } from '../../models/vocabulary.model';
import { DEFAULT_VOCABULARY_PROGRESS } from '../../models/vocabulary.model';

const now = new Date('2026-06-10T00:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');
const future = new Date('2026-07-01T00:00:00Z');

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
    return {
        kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: new Set() },
        learningQueue: [],
        grammarQueue: [],
        stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
        dailyOverride: false,
        adaptive: { level: 1.0, history: [] },
        ...overrides,
    };
}

function makeGrammarProgress(overrides: Partial<GrammarProgress> = {}): GrammarProgress {
    return { ...DEFAULT_GRAMMAR_PROGRESS, grammarId: 'n5-001', ...overrides };
}

function makeGrammarPoint(overrides: Partial<GrammarPoint> = {}): GrammarPoint {
    return {
        id: 'n5-001',
        title: 'A が いちばん～',
        jlptLevel: 5,
        shortExplanation: 'superlative',
        longExplanation: 'superlative, in detail',
        formation: 'Noun + が + いちばん',
        examples: [{
            jp: 'この中で、寿司が一番好きです。',
            romaji: 'kono naka de sushi ga ichiban suki desu',
            en: 'Of all these, I like sushi the most.',
            words: [
                { surface: 'この', vocabId: null },
                { surface: '中', vocabId: 'v-naka', reading: 'なか' },
                { surface: 'で', vocabId: null },
                { surface: '、', vocabId: null },
                { surface: '寿司', vocabId: 'v-sushi', reading: 'すし' },
                { surface: 'が', vocabId: null },
                { surface: '一番', vocabId: 'v-ichiban', reading: 'いちばん' },
                { surface: '好き', vocabId: 'v-suki', reading: 'すき' },
                { surface: 'です', vocabId: null },
                { surface: '。', vocabId: null },
            ],
        }],
        ...overrides,
    };
}

function makeVocabProgress(overrides: Partial<VocabProgress> = {}): VocabProgress {
    return { ...DEFAULT_VOCABULARY_PROGRESS, ...overrides };
}

describe('selectNextGrammarView', () => {
    it('prioritizes grammarIntroCandidates for queueItem over the due pool', () => {
        const point = makeGrammarPoint();
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [makeGrammarProgress({ entry: { ...DEFAULT_GRAMMAR_PROGRESS.entry, dueDate: past } })] }),
            grammarIntroCandidates: [point],
            currentGrammarPoint: null,
        };

        const result = selectNextGrammarView(state, false, now);
        expect(result.queueItem).toEqual({ grammarId: point.id });
    });

    it('sessionState is "review" when a queued grammar point is due', () => {
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [makeGrammarProgress({ entry: { ...DEFAULT_GRAMMAR_PROGRESS.entry, dueDate: past } })] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: null,
        };

        expect(selectNextGrammarView(state, false, now).sessionState).toBe('review');
    });

    it('sessionState is "learn" when nothing is due but more grammar can be learned', () => {
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: null,
        };

        expect(selectNextGrammarView(state, true, now).sessionState).toBe('learn');
    });

    it('sessionState is "waiting" when learning items exist but none are due and nothing more to learn', () => {
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [makeGrammarProgress({ entry: { ...DEFAULT_GRAMMAR_PROGRESS.entry, dueDate: future } })] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: null,
        };

        const result = selectNextGrammarView(state, false, now);
        expect(result.sessionState).toBe('waiting');
        expect(result.nextReviewAt).toEqual(future);
    });

    it('sessionState is "exhausted" with an empty queue and nothing learnable', () => {
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: null,
        };

        expect(selectNextGrammarView(state, false, now).sessionState).toBe('exhausted');
    });

    it('shouldShowIntro is true when the loaded point has no matching queue entry yet', () => {
        const point = makeGrammarPoint();
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: point,
        };

        expect(selectNextGrammarView(state, false, now).shouldShowIntro).toBe(true);
    });

    it('shouldShowIntro is false once the point has been introduced', () => {
        const point = makeGrammarPoint();
        const state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'> = {
            progress: makeProgress({ grammarQueue: [makeGrammarProgress({ grammarId: point.id, introductionAt: past })] }),
            grammarIntroCandidates: [],
            currentGrammarPoint: point,
        };

        expect(selectNextGrammarView(state, false, now).shouldShowIntro).toBe(false);
    });
});

describe('computeBlankPlan', () => {
    it('blanks only words resolved to a vocab the user already knows (introduced)', () => {
        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = computeBlankPlan(point, progress, 0)!;
        // Only the word matching vocabId 'v-sushi' (index 4, "寿司") is known.
        expect(plan.blankWordIndices).toEqual([4]);
    });

    it('falls back to blanking every content word when none are known yet', () => {
        const point = makeGrammarPoint();
        const progress = makeProgress({ learningQueue: [] });

        const plan = computeBlankPlan(point, progress, 0)!;
        const contentIndices = point.examples[0].words
            .map((w, i) => (w.vocabId !== null ? i : null))
            .filter((i): i is number => i !== null);

        expect(plan.blankWordIndices).toEqual(contentIndices);
    });

    it('a vocab entry that exists but was never introduced does not count as known', () => {
        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: null })],
        });

        const plan = computeBlankPlan(point, progress, 0)!;
        // Falls back to "blank everything" since nothing is actually known.
        expect(plan.blankWordIndices.length).toBeGreaterThan(1);
    });

    it('returns null when the grammar point has no examples', () => {
        const point = makeGrammarPoint({ examples: [] });
        expect(computeBlankPlan(point, null, 0)).toBeNull();
    });

    it('picks a deterministic example index for the same point/reviewCount pair', () => {
        const point = makeGrammarPoint({
            examples: [
                { jp: 'A', romaji: 'a', en: 'a', words: [] },
                { jp: 'B', romaji: 'b', en: 'b', words: [] },
                { jp: 'C', romaji: 'c', en: 'c', words: [] },
            ],
        });

        const first = computeBlankPlan(point, null, 3);
        const second = computeBlankPlan(point, null, 3);
        expect(first).toEqual(second);
    });
});

describe('selectCurrentGrammarProgress', () => {
    it('returns null without a currentGrammarPoint', () => {
        expect(selectCurrentGrammarProgress({ currentGrammarPoint: null, progress: makeProgress() })).toBeNull();
    });

    it('finds the matching GrammarProgress by id', () => {
        const point = makeGrammarPoint();
        const gp = makeGrammarProgress({ grammarId: point.id });
        const result = selectCurrentGrammarProgress({ currentGrammarPoint: point, progress: makeProgress({ grammarQueue: [gp] }) });
        expect(result).toBe(gp);
    });
});

describe('selectNextGrammarSessionPreview', () => {
    it('buckets retries, new, and review as mutually exclusive, retries taking precedence', () => {
        const progress = makeProgress({
            grammarQueue: [
                makeGrammarProgress({ grammarId: 'retry-1', needsRetry: true, totalReviews: 1 }),
                makeGrammarProgress({ grammarId: 'new-1', totalReviews: 0 }),
                makeGrammarProgress({ grammarId: 'review-1', totalReviews: 1, entry: { ...DEFAULT_GRAMMAR_PROGRESS.entry, dueDate: past } }),
                makeGrammarProgress({ grammarId: 'graduated-1', stage: 'graduated', totalReviews: 5 }),
            ],
        });

        const preview = selectNextGrammarSessionPreview({ progress }, now);
        expect(preview).toEqual({ review: 1, new: 1, retries: 1 });
    });

    it('is all-zero without progress', () => {
        expect(selectNextGrammarSessionPreview({ progress: null }, now)).toEqual({ review: 0, new: 0, retries: 0 });
    });
});
