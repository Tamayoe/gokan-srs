import { CONSTANTS } from "../commons/constants";
export function computeSessionView(progress, settings, hasMoreLearnable, now = new Date()) {
    console.debug('progress', progress);
    console.debug('settings', settings);
    console.debug('hasMoreLearnable', hasMoreLearnable);
    if (!progress || !settings || !hasMoreLearnable) {
        return { sessionState: 'exhausted', nextReviewAt: null };
    }
    const learning = progress.learningQueue.filter(v => v.stage === 'learning');
    const due = learning.filter(v => v.nextReviewAt && v.nextReviewAt <= now);
    if (due.length > 0) {
        return { sessionState: 'review', nextReviewAt: null };
    }
    const nextReviewAt = learning
        .map(v => v.nextReviewAt)
        .filter((date) => !!date)
        .map((date) => typeof date === 'string' ? new Date(date) : date)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const dailyLimitReached = progress.stats.newLearnedToday >= CONSTANTS.srs.dailyNewLimit &&
        !progress.dailyOverride;
    return {
        sessionState: !dailyLimitReached
            ? 'learn'
            : learning.length > 0
                ? 'waiting'
                : 'exhausted',
        nextReviewAt,
    };
}
