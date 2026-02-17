import { THEME } from "../../../commons/theme";
import type { UserProgress } from "../../../models/user.model";
import { useMemo } from "react";

interface ReviewForecastProps {
    progress: UserProgress;
}

export function ReviewForecast({ progress }: ReviewForecastProps) {
    const forecast = useMemo(() => {
        const queue = progress.learningQueue || [];
        const daysToShow = 7;
        const now = new Date();
        const buckets: { label: string, readingCount: number, meaningCount: number, date: Date }[] = [];

        // Initialize buckets
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            d.setHours(0, 0, 0, 0); // Normalize to midnight

            const label = i === 0 ? 'Today' :
                i === 1 ? 'Tomorrow' :
                    d.toLocaleDateString('en-US', { weekday: 'short' });

            buckets.push({ label, readingCount: 0, meaningCount: 0, date: d });
        }

        // Aggregate
        queue.forEach(v => {
            // Count Reading Reviews
            if (v.reading.dueDate) {
                const due = new Date(v.reading.dueDate);
                if (due < now) {
                    buckets[0].readingCount++;
                } else {
                    const dueDay = new Date(due);
                    dueDay.setHours(0, 0, 0, 0);
                    const bucket = buckets.find(b => b.date.getTime() === dueDay.getTime());
                    if (bucket) bucket.readingCount++;
                }
            }

            // Count Meaning Reviews
            if (v.meaning.dueDate) {
                const due = new Date(v.meaning.dueDate);
                if (due < now) {
                    buckets[0].meaningCount++;
                } else {
                    const dueDay = new Date(due);
                    dueDay.setHours(0, 0, 0, 0);
                    const bucket = buckets.find(b => b.date.getTime() === dueDay.getTime());
                    if (bucket) bucket.meaningCount++;
                }
            }
        });

        // Calculate max for scaling (min 10)
        // Sum of reading + meaning for total height
        const maxCount = Math.max(10, ...buckets.map(b => b.readingCount + b.meaningCount));

        return { buckets, maxCount };
    }, [progress]);

    return (
        <div className="w-full flex justify-between items-end h-[200px] gap-2 py-4 relative">
            {/* Background Grid */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex flex-col justify-between py-4 pl-4">
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
                <div className="w-full h-px border-t border-dashed border-divider/50"></div>
            </div>

            {forecast.buckets.map((bucket, i) => {
                const total = bucket.readingCount + bucket.meaningCount;
                const readingHeight = (bucket.readingCount / forecast.maxCount) * 100;
                const meaningHeight = (bucket.meaningCount / forecast.maxCount) * 100;

                return (
                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group z-10">
                        <div className="relative w-full flex flex-col justify-end items-center flex-1 mb-2 max-w-[28px]">
                            {/* Stacked Bars Container */}
                            <div className="w-full flex flex-col-reverse items-center justify-end h-full">

                                {/* Reading Bar (Bottom) */}
                                <div
                                    className={`w-full transition-all duration-300 relative rounded-b-sm ${bucket.meaningCount === 0 ? 'rounded-t-sm' : ''}`}
                                    style={{
                                        height: `${readingHeight}%`,
                                        backgroundColor: THEME.mastery.reading.loop1
                                    }}
                                >
                                </div>

                                {/* Meaning Bar (Top) */}
                                <div
                                    className={`w-full transition-all duration-300 relative rounded-t-sm ${bucket.readingCount === 0 ? 'rounded-b-sm' : ''}`}
                                    style={{
                                        height: `${meaningHeight}%`,
                                        backgroundColor: THEME.mastery.meaning.loop1
                                    }}
                                >
                                </div>
                            </div>

                            {/* Total Label (Top) */}
                            <span className="text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 text-gray-600 dark:text-gray-400">
                                {total}
                            </span>
                        </div>

                        <span className="text-xs text-secondary font-medium mt-2">
                            {bucket.label}
                        </span>

                        {/* Legend/Total Text at bottom */}
                        <div className="flex flex-col items-center text-[10px] text-tertiary mt-1 leading-none">
                            <span>{i === 0 && total > 0 ? '(Due)' : total > 0 ? total : '-'}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
