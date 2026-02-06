import type { UserProgress } from "../../../models/user.model";
import { useMemo } from "react";
import type { ReviewLog } from "../../../models/vocabulary.model";

interface StatsOverviewProps {
    progress: UserProgress;
}

export function StatsOverview({ progress }: StatsOverviewProps) {

    const stats = useMemo(() => {
        const queue = progress.learningQueue || [];

        // Volume
        const totalLearned = queue.length;
        const graduated = queue.filter(v => v.stage === 'graduated').length;
        const learning = queue.filter(v => v.stage === 'learning').length;

        // Reviews & Winrate
        let totalCorrect = 0;
        let totalAnswers = 0;

        queue.forEach(v => {
            const allHistory: ReviewLog[] = [
                ...(v.reading?.history || []),
                ...(v.meaning?.history || [])
            ];

            allHistory.forEach(r => {
                // Ignore 'pass' if we only want active answers, but usually pass counts as neutral or ignore?
                // Let's count correct/minor_error as success (or just correct)
                // "Winrate" usually implies strictly correct or correct+minor.
                // Let's check srs.service.ts logic: result can be 'correct', 'minor_error', 'wrong', 'pass'

                if (r.result === 'pass') return;

                totalAnswers++;
                if (r.result === 'correct' || r.result === 'minor_error') {
                    totalCorrect++;
                }
            });
        });

        const winrate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

        return {
            totalLearned,
            graduated,
            learning,
            totalAnswers,
            winrate
        };
    }, [progress]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
            <StatCard title="Global Win Rate" value={`${stats.winrate}%`} subtitle={`${stats.totalAnswers} reviews`} />
            <StatCard title="Total Vocab" value={stats.totalLearned} subtitle="Introduced" />
            <StatCard title="Learning" value={stats.learning} subtitle="In progress" />
            <StatCard title="Graduated" value={stats.graduated} subtitle="Mastered" />
        </div>
    );
}

function StatCard({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) {
    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-28 transform transition-transform hover:scale-105 duration-200">
            <span className="text-sm text-gray-500 font-medium mb-1">{title}</span>
            <span className="text-3xl font-bold text-primary">{value}</span>
            {subtitle && <span className="text-xs text-gray-400 mt-1">{subtitle}</span>}
        </div>
    );
}
