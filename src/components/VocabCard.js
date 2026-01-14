import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { THEME } from "../commons/theme";
import { MasteryRing } from "./MasteryRing";
export function VocabCard({ vocab, progress, }) {
    function formatNextReview(date) {
        if (!date)
            return '—';
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        if (diffMs <= 0)
            return 'Now';
        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 60)
            return `in ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `in ${hours} h`;
        const days = Math.floor(hours / 24);
        if (days < 7)
            return `in ${days} d`;
        return date.toLocaleDateString();
    }
    return (_jsxs("div", { className: "rounded-lg p-4 transition-colors hover:bg-opacity-80", style: {
            backgroundColor: THEME.colors.surface,
            border: `1px solid ${THEME.colors.divider}`,
        }, children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("div", { className: "text-lg", style: {
                                    color: THEME.colors.primary,
                                    fontFamily: THEME.fonts.serif,
                                }, children: vocab.kanji }), _jsx("div", { className: "text-sm", style: { color: THEME.colors.secondary }, children: vocab.readings.join(' ・ ') })] }), _jsx(MasteryRing, { mastery: progress.mastery, size: 20 })] }), _jsx("div", { className: "mt-2 text-sm", style: { color: THEME.colors.secondary }, children: vocab.meanings.slice(0, 3).join(', ') }), _jsxs("div", { className: "mt-3 flex justify-between text-xs", style: { color: THEME.colors.muted }, children: [_jsx("span", { children: progress.stage === 'graduated'
                            ? 'Mastered'
                            : `Reviews: ${progress.totalReviews}` }), _jsx("span", { children: formatNextReview(progress.nextReviewAt) })] })] }));
}
