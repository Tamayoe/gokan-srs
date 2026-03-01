import type { SRSEntry, ReviewLog } from "@gokan-srs/core/models/vocabulary.model";
import { THEME } from "../commons/theme";
import { useMemo } from "react";

interface VocabHistoryGraphProps {
    readingEntry: SRSEntry;
    meaningEntry: SRSEntry;
    introDate?: Date | null;
}

export function VocabHistoryGraph({ readingEntry, meaningEntry, introDate }: VocabHistoryGraphProps) {
    const data = useMemo(() => {
        // Collect all history points
        const points: { date: number; type: 'reading' | 'meaning'; strength: number }[] = [];

        // Add intro as baseline 0 for both if available
        if (introDate) {
            points.push({ date: new Date(introDate).getTime(), type: 'reading', strength: 0 });
            points.push({ date: new Date(introDate).getTime(), type: 'meaning', strength: 0 });
        }

        readingEntry.history.forEach((h: ReviewLog) => {
            points.push({ date: new Date(h.date).getTime(), type: 'reading', strength: h.interval });
        });

        meaningEntry.history.forEach((h: ReviewLog) => {
            points.push({ date: new Date(h.date).getTime(), type: 'meaning', strength: h.interval });
        });

        // Current actual states as final points if they differ from last history or if history is empty
        const now = Date.now();
        points.push({ date: now, type: 'reading', strength: readingEntry.interval });
        points.push({ date: now, type: 'meaning', strength: meaningEntry.interval });

        // Sort by date
        points.sort((a, b) => a.date - b.date);

        return points;
    }, [readingEntry, meaningEntry, introDate]);

    // If practically no data, don't render graph
    if (data.length <= 4) return null; // 2 intros + 2 ends = 4

    const minDate = data[0].date;
    const maxDate = data[data.length - 1].date;
    const timeSpan = maxDate - minDate || 1; // Prevent div zero

    const maxStrength = 365; // ~1 year interval indicates mastery
    const actualMaxStrength = Math.max(...data.map(d => d.strength), 3); // scale down floor if items are very new
    const yMax = Math.min(Math.max(actualMaxStrength * 1.2, 3), maxStrength * 1.1);

    const generatePath = (type: 'reading' | 'meaning') => {
        const typePoints = data.filter(d => d.type === type);
        if (typePoints.length === 0) return "";

        return typePoints.map((p, i) => {
            const x = ((p.date - minDate) / timeSpan) * 100;
            const y = 100 - ((p.strength / yMax) * 100);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(" ");
    };

    const readingPath = generatePath('reading');
    const meaningPath = generatePath('meaning');

    return (
        <div className="w-full flex flex-col pt-4 border-t border-divider mt-6">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">Learning Curve</span>
                <div className="flex gap-4 text-xs font-gothic">
                    <span className="flex items-center gap-1 text-secondary"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: THEME.mastery.reading.loop1 }}></span> Reading</span>
                    <span className="flex items-center gap-1 text-secondary"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: THEME.mastery.meaning.loop1 }}></span> Meaning</span>
                </div>
            </div>

            <div className="w-full h-32 relative">
                <svg className="w-full h-full overflow-visible preserve-3d" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" className="text-divider opacity-30" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" className="text-divider opacity-30" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" className="text-divider opacity-50" strokeWidth="0.5" />

                    {/* Max Mastery Guideline (If applicable within view) */}
                    {yMax >= maxStrength && (
                        <line x1="0" y1={100 - ((maxStrength / yMax) * 100)} x2="100" y2={100 - ((maxStrength / yMax) * 100)} stroke="currentColor" className="text-green-500 opacity-20" strokeWidth="0.5" />
                    )}

                    {/* Reading Line */}
                    {readingPath && (
                        <path
                            d={readingPath}
                            fill="none"
                            stroke={THEME.mastery.reading.loop1}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm opacity-80"
                        />
                    )}

                    {/* Meaning Line */}
                    {meaningPath && (
                        <path
                            d={meaningPath}
                            fill="none"
                            stroke={THEME.mastery.meaning.loop1}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-sm opacity-80"
                        />
                    )}
                </svg>
            </div>
        </div>
    );
}
