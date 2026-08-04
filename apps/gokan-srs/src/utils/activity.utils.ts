import type { UserProgress } from "../models/user.model";

export interface DailyActivityBucket {
    /** Midnight (local time) of the day this bucket represents. */
    date: Date;
    correct: number;
    incorrect: number;
}

/**
 * Per-day review activity for the last `days` calendar days (oldest first, ending
 * today), aggregated from `reading.history` + `meaning.history` across the whole
 * learning queue. `pass` logs are excluded; `correct`/`minor_error` group as
 * correct and `wrong` as incorrect - the convention `DailyProgressionChart` (and
 * now the Main hub's daily activity card) both rely on, so this is the single
 * place that convention is implemented.
 */
export function buildDailyActivity(progress: UserProgress, days: number, now: Date = new Date()): DailyActivityBucket[] {
    const queue = progress.learningQueue || [];
    const buckets: DailyActivityBucket[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        buckets.push({ date: d, correct: 0, incorrect: 0 });
    }

    const bucketByTime = new Map(buckets.map(b => [b.date.getTime(), b]));

    queue.forEach(v => {
        const allHistory = [
            ...(v.reading?.history || []),
            ...(v.meaning?.history || [])
        ];

        allHistory.forEach(log => {
            if (log.result === 'pass') return;

            const logDate = new Date(log.date);
            logDate.setHours(0, 0, 0, 0);

            const bucket = bucketByTime.get(logDate.getTime());
            if (!bucket) return;

            if (log.result === 'correct' || log.result === 'minor_error') {
                bucket.correct++;
            } else if (log.result === 'wrong') {
                bucket.incorrect++;
            }
        });
    });

    return buckets;
}
