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
        const buckets: { label: string, count: number, date: Date }[] = [];

        // Initialize buckets
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            d.setHours(0, 0, 0, 0); // Normalize to midnight

            const label = i === 0 ? 'Today' :
                i === 1 ? 'Tomorrow' :
                    d.toLocaleDateString('en-US', { weekday: 'short' });

            buckets.push({ label, count: 0, date: d });
        }

        // Aggregate
        queue.forEach(v => {
            if (!v.nextReviewAt) return;
            const due = new Date(v.nextReviewAt);

            // If due in past, it counts as "Today" (immediately due)
            if (due < now) {
                buckets[0].count++;
                return;
            }

            // Check future buckets
            const dueDay = new Date(due);
            dueDay.setHours(0, 0, 0, 0);

            const bucket = buckets.find(b => b.date.getTime() === dueDay.getTime());
            if (bucket) {
                bucket.count++;
            }
        });

        // Calculate max for scaling (min 10)
        const maxCount = Math.max(10, ...buckets.map(b => b.count));

        return { buckets, maxCount };
    }, [progress]);

    return (
        <div className="w-full flex justify-between items-end h-[200px] gap-2 px-4 py-8 bg-white rounded-lg shadow-sm border border-gray-100">
            {forecast.buckets.map((bucket, i) => (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                    <div className="relative w-full flex justify-center items-end flex-1 mb-2">
                        <div
                            className="w-full max-w-[40px] bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 rounded-t-sm transition-all duration-500 ease-out flex items-end justify-center pb-1 relative"
                            style={{ height: `${(bucket.count / forecast.maxCount) * 100}%` }}
                        >
                            {/* Value label */}
                            <span className="text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 text-gray-600">
                                {bucket.count}
                            </span>
                        </div>
                    </div>

                    <span className="text-xs text-gray-500 font-medium">
                        {bucket.label}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                        {i === 0 && bucket.count > 0 ? '(Due)' : bucket.count > 0 ? bucket.count : '-'}
                    </span>
                </div>
            ))}
        </div>
    );
}
