import type { VocabProgress } from "../models/vocabulary.model";
import type { UserProgress } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";

/**
* Return the next vocab element that is ready to be studied now.
* - Only vocab already present in the learningQueue
* - Excludes vocab whose nextReviewAt is in the future
*/
export function getNextVocabToStudy(
    queue?: VocabProgress[],
    now: Date = new Date()
): VocabProgress | null {
    if (!queue || queue.length === 0) return null;

    // 1. Priority: Due Reviews
    const due = queue.filter(v => v.nextReviewAt !== null && v.nextReviewAt <= now);
    if (due.length > 0) {
        return pickRandom(due);
    }

    // 2. Priority: New Items (Intro)
    // Only if no due reviews exist
    // Must exclude 'graduated' items (skipped/mastered) which also have nextReviewAt === null
    const newItems = queue.filter(v =>
        v.nextReviewAt === null &&
        v.stage !== 'graduated'
    );

    if (newItems.length > 0) {
        return pickRandom(newItems);
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