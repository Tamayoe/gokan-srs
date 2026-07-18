import { describe, it, expect } from 'vitest';
import { selectNextView, selectCurrentProgress, selectCurrentSentence, selectSessionStats } from './quizSelectors';
import { initialState } from './quizReducer';
import type { QuizState } from './quizReducer';
import type { UserProgress, UserSettings } from '../../models/user.model';
import type { Vocabulary, VocabProgress } from '../../models/vocabulary.model';
import { DEFAULT_VOCABULARY_PROGRESS } from '../../models/vocabulary.model';
import type { Sentence } from '../../models/sentence.model';
import { CONSTANTS } from '../../commons/constants';

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

function makeProgress(learningQueue: VocabProgress[] = []): UserProgress {
    return {
        kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: new Set(['日']) },
        learningQueue,
        stats: { newLearnedToday: 0, totalLearned: 0, totalReviews: 0 },
        dailyOverride: false,
        adaptive: { level: 1.0, history: [] },
    };
}

function makeVocabProgress(overrides: Partial<VocabProgress> = {}): VocabProgress {
    return {
        ...DEFAULT_VOCABULARY_PROGRESS,
        vocabId: 'v1',
        stage: 'learning',
        introductionAt: past,
        totalReviews: 1,
        ...overrides,
    };
}

function makeVocab(id = 'v1'): Vocabulary {
    return {
        id,
        writtenForm: { kanji: '日本', alternatives: [], containedKanji: ['日', '本'] },
        reading: { primary: 'にほん', alternatives: [] },
        frequency: { kanjiRank: 1 },
        progression: { kklcStep: 1 },
        senses: [{ pos: ['n'], misc: { rawTags: [] }, glosses: ['Japan'], related: { compounds: [] } }],
    };
}

describe('selectNextView', () => {
    it('returns exhausted with a null queueItem when there is no progress/settings', () => {
        const result = selectNextView(initialState, false, now);
        expect(result.sessionState).toBe('exhausted');
        expect(result.queueItem).toBeNull();
    });

    it('prioritizes an unfinished intro batch over due reviews', () => {
        const introVocab = makeVocab('intro-1');
        const dueItem = makeVocabProgress({
            vocabId: 'due-1',
            reading: { ...DEFAULT_VOCABULARY_PROGRESS.reading, dueDate: past },
        });
        const state: QuizState = {
            ...initialState,
            progress: makeProgress([dueItem]),
            settings: makeSettings(),
            introCandidates: [introVocab],
        };

        const result = selectNextView(state, false, now);
        expect(result.queueItem).toEqual({ vocabId: 'intro-1', quizType: 'reading', quizMode: 'base' });
    });

    it('reports sessionState "review" when a due item exists', () => {
        const dueItem = makeVocabProgress({ nextReviewAt: past, reading: { ...DEFAULT_VOCABULARY_PROGRESS.reading, dueDate: past } });
        const state: QuizState = { ...initialState, progress: makeProgress([dueItem]), settings: makeSettings() };

        const result = selectNextView(state, false, now);
        expect(result.sessionState).toBe('review');
        expect(result.queueItem).not.toBeNull();
    });

    it('reports sessionState "learn" when nothing is due but more vocab is learnable', () => {
        const state: QuizState = { ...initialState, progress: makeProgress([]), settings: makeSettings() };
        const result = selectNextView(state, /* hasMoreLearnable */ true, now);
        expect(result.sessionState).toBe('learn');
    });

    it('reports sessionState "learn-kanji" when nothing is learnable but a kanji unlock is pending', () => {
        const state: QuizState = {
            ...initialState,
            progress: makeProgress([]),
            settings: makeSettings(),
            nextKanjiToLearn: { step: 11, kanjis: ['月'] },
        };
        const result = selectNextView(state, false, now);
        expect(result.sessionState).toBe('learn-kanji');
    });

    it('reports sessionState "waiting" with the earliest upcoming review date when nothing is due/learnable', () => {
        const upcoming = makeVocabProgress({ vocabId: 'later', nextReviewAt: future, stage: 'learning' });
        const state: QuizState = { ...initialState, progress: makeProgress([upcoming]), settings: makeSettings() };
        const result = selectNextView(state, false, now);

        expect(result.sessionState).toBe('waiting');
        expect(result.nextReviewAt).toEqual(future);
    });

    it('reports sessionState "exhausted" when there is nothing due, learnable, or upcoming', () => {
        const state: QuizState = { ...initialState, progress: makeProgress([]), settings: makeSettings() };
        const result = selectNextView(state, false, now);
        expect(result.sessionState).toBe('exhausted');
    });

    it('never surfaces a meaning-only-due item as sessionState "review" when meaning quizzes are disabled', () => {
        // Regression guard for the meaning-quiz-disabled scheduling strand fixed in Phase 2:
        // vocabNextReviewAt/applyAnswer now keep nextReviewAt consistent with what
        // getNextVocabToStudy will actually surface, so this must never disagree.
        const meaningOnlyDue = makeVocabProgress({
            reading: { ...DEFAULT_VOCABULARY_PROGRESS.reading, memoryStrength: CONSTANTS.srs.formula.mastery.maxMemoryStrength, dueDate: null },
            meaning: { ...DEFAULT_VOCABULARY_PROGRESS.meaning, dueDate: past },
        });
        const state: QuizState = { ...initialState, progress: makeProgress([meaningOnlyDue]), settings: makeSettings({ enableMeaningQuiz: false }) };

        const result = selectNextView(state, false, now);
        expect(result.sessionState).not.toBe('review');
        expect(result.queueItem).toBeNull();
    });

    it('shouldShowIntro is true when the loaded vocab has no matching queue entry yet', () => {
        const vocab = makeVocab('new-vocab');
        const state: QuizState = { ...initialState, progress: makeProgress([]), settings: makeSettings(), currentVocab: vocab };
        const result = selectNextView(state, false, now);
        expect(result.shouldShowIntro).toBe(true);
    });

    it('shouldShowIntro is true when the queue entry exists but has not been introduced yet', () => {
        const vocab = makeVocab('v1');
        const notIntroduced = makeVocabProgress({ vocabId: 'v1', introductionAt: null });
        const state: QuizState = { ...initialState, progress: makeProgress([notIntroduced]), settings: makeSettings(), currentVocab: vocab };
        const result = selectNextView(state, false, now);
        expect(result.shouldShowIntro).toBe(true);
    });

    it('shouldShowIntro is false once the vocab has been introduced', () => {
        const vocab = makeVocab('v1');
        const introduced = makeVocabProgress({ vocabId: 'v1', introductionAt: past });
        const state: QuizState = { ...initialState, progress: makeProgress([introduced]), settings: makeSettings(), currentVocab: vocab };
        const result = selectNextView(state, false, now);
        expect(result.shouldShowIntro).toBe(false);
    });
});

describe('selectCurrentProgress', () => {
    it('returns null without a current vocab', () => {
        expect(selectCurrentProgress({ currentVocab: null, progress: makeProgress([]) })).toBeNull();
    });

    it('finds the matching queue entry for the current vocab', () => {
        const item = makeVocabProgress({ vocabId: 'v1' });
        const result = selectCurrentProgress({ currentVocab: makeVocab('v1'), progress: makeProgress([item]) });
        expect(result).toBe(item);
    });
});

describe('selectCurrentSentence', () => {
    const sentences: Sentence[] = [
        { id: 's1', original: '日本語', en: [{ id: 'e1', text: 'Japanese' }], vocabIds: ['v1'] },
        { id: 's2', original: '日本人', en: [{ id: 'e2', text: 'Japanese person' }], vocabIds: ['v1'] },
    ];

    it('returns null without a selected sentence id', () => {
        expect(selectCurrentSentence({ currentSentences: sentences, currentSentenceId: null })).toBeNull();
    });

    it('finds the sentence matching currentSentenceId', () => {
        const result = selectCurrentSentence({ currentSentences: sentences, currentSentenceId: 's2' });
        expect(result?.original).toBe('日本人');
    });
});

describe('selectSessionStats', () => {
    it('counts non-wrong history entries as done, and due items as remaining', () => {
        const dueItem = makeVocabProgress({ nextReviewAt: past });
        const state = {
            progress: makeProgress([dueItem]),
            sessionHistory: [
                { vocabId: 'a', writtenForm: 'a', result: 'correct' as const, delta: 1 },
                { vocabId: 'b', writtenForm: 'b', result: 'wrong' as const, delta: -1 },
            ],
        };
        const stats = selectSessionStats(state, 'review', now);
        expect(stats.done).toBe(1); // only the 'correct' entry counts
        expect(stats.remaining).toBe(1); // the due item
        expect(stats.total).toBe(2);
    });

    it('adds a stable batch-size estimate for remaining when in learn mode with nothing due', () => {
        const state = { progress: makeProgress([]), sessionHistory: [] };
        const stats = selectSessionStats(state, 'learn', now);
        expect(stats.remaining).toBe(CONSTANTS.srs.newVocabBatchSize);
    });

    it('returns zeros without progress', () => {
        const stats = selectSessionStats({ progress: null, sessionHistory: [] }, 'exhausted', now);
        expect(stats).toEqual({ done: 0, remaining: 0, total: 0 });
    });
});
