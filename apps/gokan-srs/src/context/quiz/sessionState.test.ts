import { describe, it, expect } from 'vitest';
import { computeSessionState } from './sessionState';

type Item = { stage: 'learning' | 'graduated'; due: boolean; next: Date | null };
type S = 'review' | 'learn' | 'waiting' | 'exhausted' | 'learn-kanji';

const states = { review: 'review', learn: 'learn', waiting: 'waiting', exhausted: 'exhausted' } as const;

function run(items: Item[] | undefined, canLearn: boolean, extraState: S | null = null) {
    return computeSessionState<Item, S>(items, {
        isLearning: i => i.stage === 'learning',
        isDue: i => i.due,
        nextReviewAtOf: i => i.next,
        canLearn,
        states,
        extraState,
    });
}

const t = (iso: string) => new Date(iso);

describe('computeSessionState', () => {
    it('returns exhausted/null when items is undefined', () => {
        expect(run(undefined, true)).toEqual({ sessionState: 'exhausted', nextReviewAt: null });
    });

    it('is review when any learning item is due', () => {
        const r = run([{ stage: 'learning', due: true, next: t('2026-01-01') }], false);
        expect(r.sessionState).toBe('review');
        expect(r.nextReviewAt).toBeNull();
    });

    it('is learn when nothing is due but new content is learnable', () => {
        expect(run([{ stage: 'learning', due: false, next: t('2026-02-01') }], true).sessionState).toBe('learn');
    });

    it('surfaces the earliest upcoming review when not due and not learnable', () => {
        const r = run(
            [
                { stage: 'learning', due: false, next: t('2026-03-01') },
                { stage: 'learning', due: false, next: t('2026-02-01') },
            ],
            false
        );
        expect(r.sessionState).toBe('waiting');
        expect(r.nextReviewAt).toEqual(t('2026-02-01'));
    });

    it('is exhausted when nothing is due, nothing learnable, and no learning items remain', () => {
        expect(run([{ stage: 'graduated', due: false, next: null }], false).sessionState).toBe('exhausted');
    });

    it('slots extraState between learn and waiting', () => {
        const r = run([{ stage: 'learning', due: false, next: t('2026-02-01') }], false, 'learn-kanji');
        expect(r.sessionState).toBe('learn-kanji');
    });
});
