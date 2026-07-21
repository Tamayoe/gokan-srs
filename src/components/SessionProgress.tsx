import React from 'react';
import { useQuiz } from '../context/useQuiz';
import { useResponsive } from '../context/Responsive/useResponsive';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * The `done / total` counter, with two extra signals the flat count can't show:
 *  - retries (highlighted, appended to the total): committed tasks the user got
 *    wrong this session and still has to redo.
 *  - waiting: reviews that came due AFTER this session started - deliberately kept
 *    out of the total so the denominator stays stable, surfaced as "n+ waiting".
 */
const SessionCounter: React.FC<{
    done: number;
    total: number;
    retriesPending: number;
}> = ({ done, total, retriesPending }) => (
    <span className="tabular-nums">
        {done} <span className="text-secondary-400 font-normal">/ {total}</span>
        {retriesPending > 0 && (
            <span className="text-desaturated-red-600 font-normal" title="Answers to redo before this session is complete">
                {' '}+{retriesPending}
            </span>
        )}
    </span>
);

const WaitingNote: React.FC<{ waiting: number; moreNew: boolean }> = ({ waiting, moreNew }) => {
    if (waiting === 0 && !moreNew) return null;
    const label = waiting > 0
        ? `${waiting}${moreNew ? '+' : ''} vocab waiting after this session`
        : 'More vocab available after this session';
    return <span className="text-secondary-400 text-xs italic">{label}</span>;
};

export const SessionProgress: React.FC = () => {
    const { sessionStats } = useQuiz();
    const { isMobile } = useResponsive();

    const { done, total, retriesPending, waiting, moreNew } = sessionStats;

    // Retries extend the denominator so the bar can't read 100% while redos remain.
    const barTotal = total + retriesPending;
    const progressPercent = barTotal > 0 ? (done / barTotal) * 100 : 0;

    return (
        <div className="w-full max-w-4xl mx-auto mb-6">
            {/* Desktop View */}
            {!isMobile && (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-secondary-400 text-sm font-medium">Session Progress</div>
                            <div className="text-secondary-400 text-sm font-medium">
                                <SessionCounter done={done} total={total} retriesPending={retriesPending} />
                            </div>
                        </div>

                        <div className="h-2 bg-secondary-200/50 rounded-full overflow-hidden flex">
                            {/* Progress Segment */}
                            <div
                                className="h-full bg-primary-600 transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>

                        <WaitingNote waiting={waiting} moreNew={moreNew} />
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
                            <SessionCounter done={done} total={total} retriesPending={retriesPending} />
                        </div>
                    </div>
                    {/* Mobile Thin Line */}
                    <div className="h-1 w-full bg-secondary-200 mt-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-600 transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="px-1 mt-1">
                        <WaitingNote waiting={waiting} moreNew={moreNew} />
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
                        <Link
                            to={`/vocab/${item.vocabId}`}
                            className={`font-serif hover:underline cursor-pointer ${item.result === 'correct' ? 'text-emerald-600' :
                                item.result === 'minor_error' ? 'text-amber-600' :
                                    'text-desaturated-red-600'
                                }`}
                            onClick={(e) => {
                                // Since it's within a ticker, stop propagation isn't strictly necessary but safe
                                e.stopPropagation();
                            }}
                        >
                            {item.writtenForm}
                        </Link>

                        {/* Result Icon/Indicator */}
                        {item.result === 'correct' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        {item.result === 'minor_error' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                        {item.result === 'wrong' && <XCircle className="w-3 h-3 text-desaturated-red-500" />}

                        {/* Delta */}
                        <span className="text-xs text-secondary-400 tabular-nums">
                            {item.delta > 0 ? '+' : ''}{Math.round(item.delta)}%
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
