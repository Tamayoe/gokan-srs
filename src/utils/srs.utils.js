import { CONSTANTS } from "../commons/constants";
/**
 * Return the next vocab element that is ready to be studied now.
 * - Only vocab already present in the learningQueue
 * - Excludes mastered vocab (mastery === 100)
 * - Excludes vocab whose nextReviewAt is in the future
 */
export function getNextVocabToStudy(queue, now = new Date()) {
    if (!queue || queue.length === 0)
        return null;
    const due = queue
        .filter(v => v.mastery < 100 &&
        v.nextReviewAt !== null &&
        v.nextReviewAt <= now)
        .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime());
    return due[0] ?? null;
}
export function hasDueVocab(queue, now) {
    return queue.some(v => v.nextReviewAt !== null && v.nextReviewAt <= now);
}
export function canIntroduceNew(progress, now) {
    const dueCount = progress.learningQueue.filter(v => v.nextReviewAt !== null && v.nextReviewAt <= now).length;
    const dailyLimitReached = progress.stats.newLearnedToday >= CONSTANTS.srs.dailyNewLimit &&
        !progress.dailyOverride;
    return (dueCount === 0 &&
        !dailyLimitReached);
}
