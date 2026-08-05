import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    selectNextGrammarView,
    computeBlankPlan,
    gradeGrammarAnswers,
    selectCurrentGrammarProgress,
    selectNextGrammarSessionPreview,
} from './grammarSelectors';
import type { QuizState } from './quizReducer';
import type { UserProgress } from '../../models/user.model';
import type { GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import { DEFAULT_GRAMMAR_PROGRESS } from '../../models/grammar.model';
import type { VocabProgress } from '../../models/vocabulary.model';
import { DEFAULT_VOCABULARY_PROGRESS } from '../../models/vocabulary.model';
import type { Vocabulary } from '../../models/vocabulary.model';
import { VocabularyService } from '../../services/vocabulary.service';

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

function makeVocab(overrides: Partial<Vocabulary> = {}): Vocabulary {
    return {
        id: 'v-x',
        writtenForm: { kanji: '', alternatives: [], containedKanji: [] },
        reading: { primary: '', alternatives: [] },
        frequency: { kanjiRank: 500 },
        progression: { kklcStep: 0 },
        senses: [],
        ...overrides,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

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
    it('blanks only words resolved to a vocab the user already knows (introduced)', async () => {
        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        // Only the word matching vocabId 'v-sushi' (index 4, "寿司") is known.
        expect(plan.blankWordIndices).toEqual([4]);
        expect(plan.readOnly).toBe(false);
    });

    it('accept list always includes at least the surface and embedded reading, even if the vocab fetch fails', async () => {
        vi.spyOn(VocabularyService, 'loadVocab').mockRejectedValue(new Error('network error'));
        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(plan.acceptLists[0]).toEqual(expect.arrayContaining(['寿司', 'すし']));
    });

    it('extends the accept list with vocab writtenForm/reading alternatives and merged-vocab readings', async () => {
        vi.spyOn(VocabularyService, 'loadVocab').mockResolvedValue(makeVocab({
            id: 'v-sushi',
            writtenForm: { kanji: '寿司', alternatives: ['鮨', '鮓'], containedKanji: [] },
            reading: { primary: 'すし', alternatives: ['寿し'] },
            mergedVocabs: [{ id: 'v-alt', isBase: false, originalPrimaryReading: '壽司', originalGlosses: [] }],
        }));

        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(new Set(plan.acceptLists[0])).toEqual(new Set(['寿司', 'すし', '鮨', '鮓', '寿し', '壽司']));
    });

    it('resolves a hint gloss from the vocab senses', async () => {
        vi.spyOn(VocabularyService, 'loadVocab').mockResolvedValue(makeVocab({
            id: 'v-sushi',
            senses: [{ pos: [], misc: { rawTags: [] }, glosses: ['sushi'], related: { compounds: [] } }],
        }));

        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(plan.glosses[0]).toBe('sushi');
    });

    it('prefers a different example containing a known word over blanking every word in an example with none known (item 5.1)', async () => {
        const point = makeGrammarPoint({
            examples: [
                {
                    jp: '中が好きです。', romaji: 'naka ga suki desu', en: 'I like the inside.',
                    words: [{ surface: '中', vocabId: 'v-naka', reading: 'なか' }, { surface: '好き', vocabId: 'v-suki', reading: 'すき' }],
                },
                {
                    jp: '寿司が好きです。', romaji: 'sushi ga suki desu', en: 'I like sushi.',
                    words: [{ surface: '寿司', vocabId: 'v-sushi', reading: 'すし' }, { surface: '好き', vocabId: 'v-suki', reading: 'すき' }],
                },
            ],
        });
        // Only 'v-sushi' (in example index 1) is known - example index 0 has candidates but none known.
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(plan.exampleIndex).toBe(1);
        expect(plan.blankWordIndices).toEqual([0]);
        expect(plan.readOnly).toBe(false);
    });

    it('falls back to a single most-frequent-word blank when no example has a known word (item 5.2)', async () => {
        vi.spyOn(VocabularyService, 'loadVocab').mockImplementation(async (id: string) => {
            const ranks: Record<string, number> = { 'v-naka': 5000, 'v-sushi': 800, 'v-ichiban': 3000, 'v-suki': 1500 };
            return makeVocab({ id, frequency: { kanjiRank: ranks[id] ?? 999999 } });
        });

        const point = makeGrammarPoint();
        const progress = makeProgress({ learningQueue: [] });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        // 'v-sushi' (index 4) has the lowest (most frequent) kanjiRank among the candidates.
        expect(plan.blankWordIndices).toEqual([4]);
        expect(plan.readOnly).toBe(false);
    });

    it('a vocab entry that exists but was never introduced does not count as known, so the single-blank fallback still applies', async () => {
        vi.spyOn(VocabularyService, 'loadVocab').mockResolvedValue(makeVocab());
        const point = makeGrammarPoint();
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: null })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(plan.blankWordIndices.length).toBe(1);
    });

    it('skips an example with zero blankable words in favor of another example in the same point (item 6)', async () => {
        const point = makeGrammarPoint({
            examples: [
                { jp: 'どれでもいいですか？', romaji: 'dore demo ii desu ka', en: 'Is any of them fine?', words: [{ surface: 'どれでもいいですか', vocabId: null }] },
                {
                    jp: '寿司が好きです。', romaji: 'sushi ga suki desu', en: 'I like sushi.',
                    words: [{ surface: '寿司', vocabId: 'v-sushi', reading: 'すし' }],
                },
            ],
        });
        const progress = makeProgress({
            learningQueue: [makeVocabProgress({ vocabId: 'v-sushi', introductionAt: past })],
        });

        const plan = (await computeBlankPlan(point, progress, 0))!;
        expect(plan.exampleIndex).toBe(1);
        expect(plan.blankWordIndices).toEqual([0]);
        expect(plan.readOnly).toBe(false);
    });

    it('returns a read-only plan with no blanks when literally no example has a blankable word (item 6)', async () => {
        const point = makeGrammarPoint({
            examples: [
                { jp: 'どれでもいいですか？', romaji: 'dore demo ii desu ka', en: 'Is any of them fine?', words: [{ surface: 'どれでもいいですか', vocabId: null }] },
                { jp: 'いいですか？', romaji: 'ii desu ka', en: 'Is that fine?', words: [{ surface: 'いいですか', vocabId: null }] },
            ],
        });

        const plan = (await computeBlankPlan(point, null, 0))!;
        expect(plan.readOnly).toBe(true);
        expect(plan.blankWordIndices).toEqual([]);
        expect(plan.acceptLists).toEqual([]);
    });

    it('returns null when the grammar point has no examples', async () => {
        const point = makeGrammarPoint({ examples: [] });
        expect(await computeBlankPlan(point, null, 0)).toBeNull();
    });

    it('picks a deterministic example index for the same point/reviewCount pair', async () => {
        const point = makeGrammarPoint({
            examples: [
                { jp: 'A', romaji: 'a', en: 'a', words: [] },
                { jp: 'B', romaji: 'b', en: 'b', words: [] },
                { jp: 'C', romaji: 'c', en: 'c', words: [] },
            ],
        });

        const first = await computeBlankPlan(point, null, 3);
        const second = await computeBlankPlan(point, null, 3);
        expect(first).toEqual(second);
    });
});

describe('gradeGrammarAnswers', () => {
    const blankPlan = { acceptLists: [['すし', '寿司', '鮨', '鮓']] };

    it('grades a kanji-form answer, a variant-spelling answer, and a reading answer all as correct for the same blank', () => {
        expect(gradeGrammarAnswers(blankPlan, ['寿司'], [0]).overall).toBe('correct');
        expect(gradeGrammarAnswers(blankPlan, ['鮨'], [0]).overall).toBe('correct');
        expect(gradeGrammarAnswers(blankPlan, ['すし'], [0]).overall).toBe('correct');
    });

    it('grades an unrelated answer as wrong', () => {
        const result = gradeGrammarAnswers(blankPlan, ['ねこ'], [0]);
        expect(result.overall).toBe('wrong');
        expect(result.perBlankResults).toEqual(['wrong']);
    });

    it('a blank with hintLevel >= 2 grades as pass regardless of what was typed', () => {
        const result = gradeGrammarAnswers(blankPlan, ['garbage'], [2]);
        expect(result.perBlankResults).toEqual(['pass']);
        expect(result.matchedAnswers).toEqual(['すし']);
        expect(result.overall).toBe('pass');
    });

    it('an empty (untouched) blank at hintLevel 0 grades as wrong, not pass', () => {
        const result = gradeGrammarAnswers(blankPlan, [''], [0]);
        expect(result.overall).toBe('wrong');
    });

    describe('worst-of precedence: wrong > pass > minor_error > correct', () => {
        const twoBlankPlan = { acceptLists: [['すし'], ['なか']] };

        it('wrong beats pass', () => {
            const result = gradeGrammarAnswers(twoBlankPlan, ['ねこ', 'anything'], [0, 2]);
            expect(result.overall).toBe('wrong');
        });

        it('pass beats minor_error', () => {
            const result = gradeGrammarAnswers(twoBlankPlan, ['すしぃ', 'anything'], [0, 2]);
            expect(result.perBlankResults[0]).toBe('minor_error');
            expect(result.overall).toBe('pass');
        });

        it('pass beats correct', () => {
            const result = gradeGrammarAnswers(twoBlankPlan, ['すし', 'anything'], [0, 2]);
            expect(result.perBlankResults[0]).toBe('correct');
            expect(result.overall).toBe('pass');
        });

        it('all correct grades overall correct', () => {
            const result = gradeGrammarAnswers(twoBlankPlan, ['すし', 'なか'], [0, 0]);
            expect(result.overall).toBe('correct');
        });
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
