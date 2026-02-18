import React, { useMemo } from 'react';
import { useQuiz } from '../context/useQuiz';
import { useResponsive } from '../context/Responsive/useResponsive';
import { CONSTANTS } from '../commons/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const SessionProgress: React.FC = () => {
    const { state, sessionState } = useQuiz();
    const { isMobile } = useResponsive();

    // Calculate session progress
    // "Total" for this session is roughly:
    // - Reviews due at start (we don't track "at start", but we can estimate: currently due + reviewed today if they were due)
    // - New words limit (if learning)

    // Simplification for V1:
    // Reviews Done: state.progress?.stats.totalReviews (session based? No, that's lifetime or daily?)
    // Actually stats.totalReviews is lifetime.
    // We need SESSION based stats.
    // We can use state.sessionHistory.length as "Items reviewed this session".

    // Remaining Reviews: 
    // state.progress?.learningQueue.filter(v => v.nextReviewAt <= now)

    // Remaining New:
    // Limit - NewLearnedToday (if > 0)

    const stats = useMemo(() => {
        if (!state.progress) return { done: 0, remaining: 0, total: 0 };

        const now = new Date();

        // "Done" should only count successful attempts or final failures?
        // If we count every history item, "Total" grows when we fail (because remaining stays 1, but done +1).
        // To stabilize "Total", we should only count "completed" items in Done.
        // A failure -> item stays in "remaining". So failure shouldn't count as "done".
        // But history has the failure. 
        // Let's filter history for non-wrong answers? 
        // Or better: `state.sessionHistory` contains all attempts.
        // `Done` = Unique Vocab IDs in history that resulted in success? 
        // Actually simpler: 
        // Total = Items to Do + Items Done.
        // If I fail an item, it's still "Items to Do". It shouldn't be "Items Done".
        // So "Done" should be the count of *Successful* reviews in this session (or graduated/passed).
        // Let's rely on `state.progress.stats.newLearnedToday` + count of review successes?

        // Let's try: Done = History count where result != 'wrong'
        const done = state.sessionHistory.filter(h => h.result !== 'wrong').length;

        const dueReviews = state.progress.learningQueue.filter(
            v => v.nextReviewAt && v.nextReviewAt <= now
        ).length;

        const dailyLeft = Math.max(0, CONSTANTS.srs.dailyNewLimit - state.progress.stats.newLearnedToday);

        let remaining = dueReviews;

        // Only add daily limit if we are in learn mode OR if queue is empty (will trigger learn mode)
        // But for consistency:
        if (sessionState === 'learn' || dueReviews === 0) {
            remaining += dailyLeft;
        }

        return {
            done,
            remaining,
            total: done + remaining
        };
    }, [state.progress, state.sessionHistory, sessionState]);

    const progressPercent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

    return (
        <div className="w-full max-w-4xl mx-auto mb-6">
            {/* Desktop View */}
            {!isMobile && (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-secondary-400 text-sm font-medium">Session Progress</div>
                            <div className="text-secondary-400 text-sm font-medium">
                                {stats.done} / {stats.total}
                            </div>
                        </div>

                        <div className="h-2 bg-secondary-200/50 rounded-full overflow-hidden flex">
                            {/* Progress Segment */}
                            <div
                                className="h-full bg-primary-600 transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Moved History Ticker Below */}
                    <HistoryTicker />
                </div>
            )}

            {/* Mobile View */}
            {isMobile && (
                <>
                    <div className="flex items-center justify-between px-1">
                        <div className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Session Progress</div>
                        <div className="text-sm font-bold text-primary-700">
                            {stats.done} <span className="text-secondary-400 font-normal">/ {stats.total}</span>
                        </div>
                    </div>
                    {/* Mobile Thin Line */}
                    <div className="h-1 w-full bg-secondary-200 mt-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-600 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

const HistoryTicker: React.FC = () => {
    const { state } = useQuiz();
    const history = state.sessionHistory; // Most recent is at index 0

    // Take top 5 recent items
    const recentItems = history.slice(0, 5);

    return (
        <div className="flex-1 flex items-center gap-3 overflow-hidden h-8">
            <AnimatePresence initial={false}>
                {recentItems.map((item, index) => (
                    <motion.div
                        key={`${item.vocabId}-${index}`} // Unique key even if same item appears twice (retry) - actually index helps uniqueness in mapping but strict key better if we had unique ID for history item. 
                        // Using combination of ID and index in history array ensures stability.
                        initial={{ opacity: 0, y: 10, x: -10 }}
                        animate={{ opacity: 1 - (index * 0.2), y: 0, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <span className={`font-serif ${item.result === 'correct' ? 'text-emerald-600' :
                            item.result === 'minor_error' ? 'text-amber-600' :
                                'text-desaturated-red-600'
                            }`}>
                            {item.writtenForm}
                        </span>

                        {/* Result Icon/Indicator */}
                        {item.result === 'correct' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        {item.result === 'minor_error' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                        {item.result === 'wrong' && <XCircle className="w-3 h-3 text-desaturated-red-500" />}

                        {/* Delta */}
                        <span className="text-xs text-secondary-400 tabular-nums">
                            {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}
                        </span>

                        {/* Separator for all but last visible */}
                        {index < recentItems.length - 1 && (
                            <span className="text-secondary-300 mx-1">•</span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {history.length === 0 && (
                <span className="text-secondary-400 text-sm italic">Session started...</span>
            )}
        </div>
    );
};
