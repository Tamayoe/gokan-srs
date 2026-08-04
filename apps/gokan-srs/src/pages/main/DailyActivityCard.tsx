import React, { useMemo, useState } from 'react';
import { THEME } from '../../commons/theme';
import type { UserProgress } from '../../models/user.model';
import { buildDailyActivity } from '../../utils/activity.utils';

const DAYS_SHOWN = 7;

/**
 * Replaces the old ephemeral `lastSessionRecap` (overwritten by the next session,
 * so it rarely reflected a full day of several small sessions - see issue #30).
 * Reads persisted reading/meaning review history instead, so it's stable across
 * however many sessions happened today. Shares its per-day bucketing with
 * `DailyProgressionChart` via `buildDailyActivity` rather than re-deriving it.
 */
export const DailyActivityCard: React.FC<{ progress: UserProgress }> = ({ progress }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const buckets = useMemo(() => buildDailyActivity(progress, DAYS_SHOWN), [progress]);
    const today = buckets[buckets.length - 1];
    const todayReviewed = today.correct + today.incorrect;
    const maxCount = Math.max(4, ...buckets.map(b => b.correct + b.incorrect));

    return (
        <div className="mb-8 border border-divider rounded bg-surface p-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
                <div className="flex flex-col">
                    <span className="text-xs text-tertiary uppercase tracking-wider font-gothic">Today</span>
                    <span className="text-2xl text-primary leading-tight tabular-nums">{todayReviewed}</span>
                    <span className="text-sm text-secondary tabular-nums">
                        {todayReviewed === 0 ? 'No reviews yet' : (
                            <>
                                {today.correct} correct
                                {today.incorrect > 0 && <span className="text-error"> · {today.incorrect} incorrect</span>}
                            </>
                        )}
                    </span>
                </div>

                <div className="flex gap-4 self-start sm:self-end text-xs text-secondary">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.colors.secondary }} aria-hidden="true" />
                        Correct
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: THEME.colors.error }} aria-hidden="true" />
                        Incorrect
                    </span>
                </div>
            </div>

            <div className="w-full flex justify-between items-end h-16 gap-1.5">
                {buckets.map((bucket, i) => {
                    const total = bucket.correct + bucket.incorrect;
                    const correctHeight = (bucket.correct / maxCount) * 100;
                    const incorrectHeight = (bucket.incorrect / maxCount) * 100;
                    const isToday = i === buckets.length - 1;
                    const label = isToday ? 'Today' : bucket.date.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                        <div
                            key={i}
                            className="relative flex flex-col items-center flex-1 min-w-0 h-full justify-end group"
                            onMouseEnter={() => setHoverIndex(i)}
                            onMouseLeave={() => setHoverIndex(null)}
                        >
                            <div className="w-full flex flex-col-reverse items-center justify-end h-full max-w-[18px] mx-auto">
                                <div
                                    className={`w-full transition-all duration-300 ${bucket.incorrect === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`}
                                    style={{ height: `${correctHeight}%`, backgroundColor: THEME.colors.secondary }}
                                />
                                <div
                                    className={`w-full transition-all duration-300 rounded-t-sm ${bucket.correct === 0 ? 'rounded-b-sm' : ''}`}
                                    style={{ height: `${incorrectHeight}%`, backgroundColor: THEME.colors.error }}
                                />
                            </div>

                            {hoverIndex === i && total > 0 && (
                                <div className="absolute -top-12 opacity-100 transition-opacity bg-surface border border-divider shadow-md rounded p-1.5 flex flex-col items-center text-[10px] w-max z-20 pointer-events-none">
                                    <span className="font-medium text-primary">{total} reviews</span>
                                    <span className="text-secondary">{bucket.correct} correct</span>
                                    {bucket.incorrect > 0 && <span className="text-error">{bucket.incorrect} incorrect</span>}
                                </div>
                            )}

                            <span className="text-[10px] text-tertiary mt-1.5 w-full text-center truncate">
                                {label.charAt(0)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
