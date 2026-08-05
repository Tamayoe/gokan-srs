import { describe, it, expect } from 'vitest';
import { quizReducer, initialState } from './quizReducer';
import type { QuizState } from './quizReducer';
import type { UserProgress } from '../../models/user.model';
import type { GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import { DEFAULT_GRAMMAR_PROGRESS } from '../../models/grammar.model';

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
    return {
        kanjiKnowledge: { method: 'kklc', step: 10, kanjiSet: new Set(['日']) },
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

function makeGrammarPoint(id = 'n5-001'): GrammarPoint {
    return {
        id,
        title: 'A が いちばん～',
        jlptLevel: 5,
        shortExplanation: 'superlative',
        longExplanation: 'superlative, in detail',
        formation: 'Noun + が + いちばん',
        examples: [{ jp: '寿司が一番好きです。', romaji: 'sushi ga ichiban suki desu', en: 'I like sushi the most.', words: [] }],
    };
}

describe('grammarReducer (via quizReducer)', () => {
    it('GRAMMAR_LOAD_START sets isLoadingGrammar and currentGrammarQuizItem, clears prior answers/feedback', () => {
        const state: QuizState = {
            ...initialState,
            grammarAnswers: ['stale'],
            grammarFeedback: { show: true, correct: true, type: 'correct', message: '', matchedAnswers: [], perBlankResults: [] },
        };
        const next = quizReducer(state, { type: 'GRAMMAR_LOAD_START', payload: { grammarId: 'n5-001' } });

        expect(next.isLoadingGrammar).toBe(true);
        expect(next.currentGrammarQuizItem).toEqual({ grammarId: 'n5-001' });
        expect(next.grammarAnswers).toEqual([]);
        expect(next.grammarFeedback).toBeNull();
    });

    it('GRAMMAR_LOAD_SUCCESS sets the point/blankPlan and sizes grammarAnswers to the blank count', () => {
        const point = makeGrammarPoint();
        const next = quizReducer(initialState, {
            type: 'GRAMMAR_LOAD_SUCCESS',
            payload: { point, blankPlan: { exampleIndex: 0, blankWordIndices: [1, 3] } },
        });

        expect(next.currentGrammarPoint).toBe(point);
        expect(next.grammarAnswers).toEqual(['', '']);
        expect(next.isLoadingGrammar).toBe(false);
    });

    it('GRAMMAR_LOAD_ERROR sets a fatalError, mirroring LOAD_VOCAB_ERROR', () => {
        const next = quizReducer(initialState, {
            type: 'GRAMMAR_LOAD_ERROR',
            payload: { grammarId: 'n5-001', error: new Error('boom') },
        });

        expect(next.fatalError).toContain('n5-001');
        expect(next.isLoadingGrammar).toBe(false);
    });

    it('GRAMMAR_SET_ANSWER updates only the targeted blank index', () => {
        const state: QuizState = { ...initialState, grammarAnswers: ['a', 'b', 'c'] };
        const next = quizReducer(state, { type: 'GRAMMAR_SET_ANSWER', payload: { index: 1, value: 'x' } });

        expect(next.grammarAnswers).toEqual(['a', 'x', 'c']);
    });

    it('GRAMMAR_SUBMIT_ANSWER shows feedback with correct=true only for a strict correct result', () => {
        const next = quizReducer(initialState, {
            type: 'GRAMMAR_SUBMIT_ANSWER',
            payload: { type: 'minor_error', message: 'Close.', matchedAnswers: ['えいが'], perBlankResults: ['minor_error'] },
        });

        expect(next.grammarFeedback?.show).toBe(true);
        expect(next.grammarFeedback?.correct).toBe(false);
        expect(next.grammarFeedback?.perBlankResults).toEqual(['minor_error']);
    });

    it('GRAMMAR_UPDATE_AFTER_ANSWER assigns progress and clears feedback/answers', () => {
        const progress = makeProgress({ grammarQueue: [makeGrammarProgress({ totalReviews: 1 })] });
        const state: QuizState = {
            ...initialState,
            grammarFeedback: { show: true, correct: true, type: 'correct', message: '', matchedAnswers: [], perBlankResults: [] },
            grammarAnswers: ['x'],
        };
        const next = quizReducer(state, { type: 'GRAMMAR_UPDATE_AFTER_ANSWER', payload: { progress } });

        expect(next.progress).toBe(progress);
        expect(next.grammarFeedback).toBeNull();
        expect(next.grammarAnswers).toEqual([]);
    });

    it('GRAMMAR_ADVANCE_QUEUE assigns progress and appends candidates when provided', () => {
        const progress = makeProgress();
        const point = makeGrammarPoint();
        const next = quizReducer(initialState, {
            type: 'GRAMMAR_ADVANCE_QUEUE',
            payload: { progress, candidates: [point] },
        });

        expect(next.progress).toBe(progress);
        expect(next.grammarIntroCandidates).toEqual([point]);
    });

    describe('GRAMMAR_INTRO_CHOICE', () => {
        it('learn: appends a new GrammarProgress with nextReviewAt set to now', () => {
            const state: QuizState = { ...initialState, progress: makeProgress() };
            const next = quizReducer(state, { type: 'GRAMMAR_INTRO_CHOICE', grammarId: 'n5-001', choice: 'learn' });

            const added = next.progress!.grammarQueue.find(g => g.grammarId === 'n5-001');
            expect(added).toBeDefined();
            expect(added!.nextReviewAt).not.toBeNull();
            expect(added!.stage).toBe('learning');
        });

        it('skip: appends a graduated GrammarProgress', () => {
            const state: QuizState = { ...initialState, progress: makeProgress() };
            const next = quizReducer(state, { type: 'GRAMMAR_INTRO_CHOICE', grammarId: 'n5-001', choice: 'skip' });

            const added = next.progress!.grammarQueue.find(g => g.grammarId === 'n5-001');
            expect(added!.stage).toBe('graduated');
        });

        it('removes the point from grammarIntroCandidates when it was already there', () => {
            const point = makeGrammarPoint();
            const state: QuizState = {
                ...initialState,
                progress: makeProgress(),
                grammarIntroCandidates: [point],
            };
            const next = quizReducer(state, { type: 'GRAMMAR_INTRO_CHOICE', grammarId: point.id, choice: 'learn', grammarPoint: point });

            expect(next.grammarIntroCandidates).toEqual([]);
        });

        it('inserts an out-of-band grammarPoint (detail-page style "learn") into candidates rather than requiring it be there first', () => {
            const point = makeGrammarPoint('n5-999');
            const state: QuizState = { ...initialState, progress: makeProgress(), grammarIntroCandidates: [] };
            const next = quizReducer(state, { type: 'GRAMMAR_INTRO_CHOICE', grammarId: point.id, choice: 'learn', grammarPoint: point });

            expect(next.grammarIntroCandidates).toEqual([point]);
        });

        it('is a no-op without progress', () => {
            const next = quizReducer(initialState, { type: 'GRAMMAR_INTRO_CHOICE', grammarId: 'n5-001', choice: 'learn' });
            expect(next).toBe(initialState);
        });
    });
});
