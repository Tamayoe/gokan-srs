import type { VocabProgress } from "../models/vocabulary.model";
import type { UserProgress } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";

/**
 * Return the next vocab element that is ready to be studied now.
 * Implements simple prioritized flow:
 * 1. Old Reviews + Retry items (mixed randomly)
 * 2. New Intros (not introduced yet)
 * 3. First Reviews (totalReviews === 0, introduced but not tested yet)
 */
export function getNextVocabToStudy(
    queue?: VocabProgress[],
    now: Date = new Date()
): VocabProgress | null {
    if (!queue || queue.length === 0) return null;

    // 1. Priority: Old Reviews + Retry items (mixed together)
    const reviewsAndRetries = queue.filter(v =>
        // Old reviews (already reviewed at least once)
        (v.totalReviews > 0 && v.nextReviewAt !== null && v.nextReviewAt <= now) ||
        // Retry items (wrong answer in current session)
        v.needsRetry === true
    );
    if (reviewsAndRetries.length > 0) {
        return pickRandom(reviewsAndRetries);
    }

    // 2. Priority: New Intros (not introduced yet)
    const newIntros = queue.filter(v =>
        v.introductionAt === null &&
        v.stage !== 'graduated'
    );
    if (newIntros.length > 0) {
        return pickRandom(newIntros);
    }

    // 3. Priority: First Reviews (just introduced, totalReviews === 0)
    const firstReviews = queue.filter(v =>
        v.totalReviews === 0 &&
        v.introductionAt !== null &&
        v.nextReviewAt !== null &&
        v.nextReviewAt <= now &&
        v.stage !== 'graduated'
    );
    if (firstReviews.length > 0) {
        return pickRandom(firstReviews);
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