import { THEME } from "../../../commons/theme";
import type { UserProgress } from "@gokan-srs/core/models/user.model";
import { useMemo } from "react";

interface DailyProgressionChartProps {
    progress: UserProgress;
}

export function DailyProgressionChart({ progress }: DailyProgressionChartProps) {
    const progression = useMemo(() => {
        const queue = progress.learningQueue || [];
        const daysToShow = 14;
        const now = new Date();
        const buckets: { label: string, correct: number, incorrect: number, date: Date, empty: boolean }[] = [];

        // Initialize buckets
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const label = i === 0 ? 'Today' : (i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short' }));
            buckets.push({ label, correct: 0, incorrect: 0, date: d, empty: true });
        }

        // Aggregate history
        queue.forEach(v => {
            const allHistory = [
                ...(v.reading?.history || []),
                ...(v.meaning?.history || [])
            ];

            allHistory.forEach(log => {
                if (log.result === 'pass') return;

                const logDate = new Date(log.date);
                logDate.setHours(0, 0, 0, 0);

                const bucket = buckets.find(b => b.date.getTime() === logDate.getTime());
                if (bucket) {
                    bucket.empty = false;
                    if (log.result === 'correct' || log.result === 'minor_error') {
                        bucket.correct++;
                    } else if (log.result === 'wrong') {
                        bucket.incorrect++;
                    }
                }
            });
        });

        // Calculate max for expected height scaling
        const maxCount = Math.max(10, ...buckets.map(b => b.correct + b.incorrect));

        return { buckets, maxCount };
    }, [progress]);

    return (
        <div className="w-full flex justify-between items-end h-[200px] gap-1 md:gap-2 py-4 relative">
            {/* Background Grid */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex flex-col justify-between py-4 pl-4">
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
            </div>

            {progression.buckets.map((bucket, i) => {
                const total = bucket.correct + bucket.incorrect;
                const correctHeight = (bucket.correct / progression.maxCount) * 100;
                const incorrectHeight = (bucket.incorrect / progression.maxCount) * 100;
                const isWeekend = bucket.date.getDay() === 0 || bucket.date.getDay() === 6;

                return (
                    <div key={i} className="flex flex-col items-center flex-1 min-w-0 h-full justify-end group z-10">
                        <div className="relative w-full flex flex-col justify-end items-center flex-1 mb-2 max-w-[28px]">
                            {/* Stacked Bars Container */}
                            <div className="w-full flex flex-col-reverse items-center justify-end h-full relative">

                                {/* Correct Bar (Bottom) */}
                                <div
                                    className={`w-full transition-all duration-300 relative rounded-b-sm ${bucket.incorrect === 0 ? 'rounded-t-sm' : ''}`}
                                    style={{
                                        height: `${correctHeight}%`,
                                        backgroundColor: THEME.colors.secondary
                                    }}
                                >
                                </div>

                                {/* Incorrect Bar (Top) */}
                                <div
                                    className={`w-full transition-all duration-300 relative rounded-t-sm ${bucket.correct === 0 ? 'rounded-b-sm' : ''}`}
                                    style={{
                                        height: `${incorrectHeight}%`,
                                        backgroundColor: THEME.colors.error
                                    }}
                                >
                                </div>
                            </div>

                            {/* Total Label (Hover Tooltip) */}
                            {total > 0 && (
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-divider shadow-md rounded p-1 flex flex-col items-center text-[10px] w-max z-20 pointer-events-none">
                                    <span className="font-bold text-primary">{total} reviews</span>
                                    <span className="text-secondary">{bucket.correct} correct</span>
                                    <span className="text-error">{bucket.incorrect} wrong</span>
                                </div>
                            )}
                        </div>

                        <span className={`text-[10px] sm:text-xs font-medium mt-2 w-full text-center truncate px-0.5 ${isWeekend ? 'opacity-70' : ''}`}>
                            <span className="sm:hidden">{bucket.label.charAt(0)}</span>
                            <span className="hidden sm:inline">{bucket.label}</span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
