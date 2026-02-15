import type { VocabProgress } from "../models/vocabulary.model";
import type { UserProgress } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";

export type QuizType = 'reading' | 'meaning';

export interface QuizItem {
    vocab: VocabProgress;
    quizType: QuizType;
}

/**
 * Return the next quiz item (vocab + type) that is ready to be studied now.
 * Implements prioritized flow (Successive Batches):
 * 1. Retries (High priority, immediate re-test)
 * 2. Due Readings (Batch 1)
 * 3. Due Meanings (Batch 2)
 * 4. New Intros (Batch 3, if allowed)
 * 5. First Reviews (Newly introduced, not yet tested)
 */
export function getNextVocabToStudy(
    queue?: VocabProgress[],
    now: Date = new Date()
): QuizItem | null {
    if (!queue || queue.length === 0) return null;

    // 1. Priority: Retries
    // TODO: Phase 2.5 - Split needsRetry into { reading: bool, meaning: bool } for precision.
    // For now, if needsRetry is true, we default to Reading (legacy behavior compatible).
    const retries = queue.filter(v => v.needsRetry === true);
    if (retries.length > 0) {
        const vocab = pickRandom(retries)!;
        return { vocab, quizType: 'reading' };
    }

    // 2. Priority: Due Readings
    const dueReadings = queue.filter(v =>
        v.totalReviews > 0 &&
        v.reading.dueDate !== null &&
        v.reading.dueDate <= now
    );
    if (dueReadings.length > 0) {
        return { vocab: pickRandom(dueReadings)!, quizType: 'reading' };
    }

    // 3. Priority: Due Meanings
    const dueMeanings = queue.filter(v =>
        v.totalReviews > 0 &&
        v.meaning.dueDate !== null &&
        v.meaning.dueDate <= now
    );
    if (dueMeanings.length > 0) {
        return { vocab: pickRandom(dueMeanings)!, quizType: 'meaning' };
    }

    // 4. Priority: New Intros (not introduced yet)
    // When introducing, we start with Reading quiz? Or just distinct Intro card?
    // The intro card leads to a "Learn" choice, which sets nextReviewAt=NOW.
    // Then it falls into "First Reviews".
    const newIntros = queue.filter(v =>
        v.introductionAt === null &&
        v.stage !== 'graduated'
    );
    if (newIntros.length > 0) {
        // Intros are type-agnostic until "Learn" is clicked, but we need a type.
        // We default to 'reading' as the primary entry point.
        return { vocab: pickRandom(newIntros)!, quizType: 'reading' };
    }

    // 5. Priority: First Reviews (just introduced, totalReviews === 0)
    // These are items user just clicked "Learn" on. They are due NOW.
    // We prioritize Reading for the first encounter.
    const firstReviews = queue.filter(v =>
        v.totalReviews === 0 &&
        v.introductionAt !== null &&
        v.nextReviewAt !== null &&
        v.nextReviewAt <= now &&
        v.stage !== 'graduated'
    );
    if (firstReviews.length > 0) {
        return { vocab: pickRandom(firstReviews)!, quizType: 'reading' };
    }

    return null;
}



export function hasDueVocab(queue: VocabProgress[], now: Date): boolean {
    return queue.some(
        v => v.nextReviewAt !== null && v.nextReviewAt <= now
    );
}

export function canIntroduceNew(
    progress: UserProgress,
    now: Date
): boolean {
    const dueCount = progress.learningQueue.filter(
        v => v.nextReviewAt !== null && v.nextReviewAt <= now
    ).length;

    const dailyLimitReached =
        progress.stats.newLearnedToday >= CONSTANTS.srs.dailyNewLimit &&
        !progress.dailyOverride;

    return (
        dueCount === 0 &&
        !dailyLimitReached
    );
}

function pickRandom<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}