import type {VocabProgress} from "../models/vocabulary.model";
import type {UserProgress} from "../models/user.model";
import {CONSTANTS} from "../commons/constants";

/**
 * Return the next vocab element that is ready to be studied now.
 * - Only vocab already present in the learningQueue
 * - Excludes mastered vocab (mastery === 100)
 * - Excludes vocab whose nextReviewAt is in the future
 */
export function getNextVocabToStudy(
    queue?: VocabProgress[],
    now: Date = new Date()
): VocabProgress | null {
    if (!queue || queue.length === 0) return null;

    const reviewable = getReviewable(queue, now);
    return pickRandom(reviewable);
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

function getReviewable(queue: VocabProgress[], now: Date = new Date()): VocabProgress[] {
    return queue.filter(v =>
        v.mastery < 100 &&
        v.nextReviewAt !== null &&
        v.nextReviewAt <= now
    ) ?? [];
}

function pickRandom<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}