import type { UserProgress, UserSettings } from "../models/user.model";
import type { SessionState } from "../models/state.model";

export function computeSessionView(
    progress: UserProgress | null,
    settings: UserSettings | null,
    hasMoreLearnable: boolean,
    hasUnlockedKanjiPending: boolean,
    hasIntroCandidates: boolean,
    now = new Date()
): {
    sessionState: SessionState;
    nextReviewAt: Date | null;
} {
    if (!progress || !settings) {
        return { sessionState: 'exhausted', nextReviewAt: null };
    }

    const learning = progress.learningQueue.filter(
        v => v.stage === 'learning'
    );

    const due = learning.filter(
        v => v.nextReviewAt && v.nextReviewAt <= now
    );

    if (due.length > 0) {
        return { sessionState: 'review', nextReviewAt: null };
    }

    const nextReviewAt =
        learning
            .map(v => v.nextReviewAt)
            .filter((date): date is NonNullable<typeof date> => !!date)
            .map((date) => typeof date === 'string' ? new Date(date) : date)
            .sort((a, b) => a.getTime() - b!.getTime())[0] ?? null;

    // Limits removed per user request
    const dailyLimitReached = false;

    // We can learn if either the async check says so, or we literally have candidates ready
    const canLearn = hasMoreLearnable || hasIntroCandidates;

    return {
        sessionState:
            !dailyLimitReached
                ? (canLearn ? 'learn' : (hasUnlockedKanjiPending ? 'learn-kanji' : (learning.length > 0 ? 'waiting' : 'exhausted')))
                : learning.length > 0
                    ? 'waiting'
                    : 'exhausted',
        nextReviewAt,
    };
}