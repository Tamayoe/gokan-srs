import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { JlptChip } from "../../components/JlptChip";
import type { GrammarPoint } from "../../models/grammar.model";
import { GrammarService } from "../../services/grammar.service";
import { useResponsive } from "../../context/Responsive/useResponsive";

interface Props {
    point: GrammarPoint;
}

const INITIAL_COUNT = 5;

/**
 * Grammar's equivalent of VocabRelationshipsCard: a linked list of the point's
 * relatedPoints (same core idea at a different formality/nuance), each
 * navigating to its own detail page. Same cap/expand pattern, since a
 * relatedPoints list can run 5-6 deep (e.g. the but/however cluster).
 */
export function GrammarRelatedPointsCard({ point }: Props) {
    const { isMobile } = useResponsive();
    const navigate = useNavigate();

    const [related, setRelated] = useState<GrammarPoint[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const relatedIds = point.relatedPoints || [];
    const isExpandable = relatedIds.length > INITIAL_COUNT;
    const displayedIds = isExpanded ? relatedIds : relatedIds.slice(0, INITIAL_COUNT);

    useEffect(() => {
        setIsExpanded(false);
    }, [point.id]);

    useEffect(() => {
        const load = async () => {
            if (displayedIds.length === 0) {
                setRelated([]);
                return;
            }
            const points = await Promise.all(displayedIds.map(id => GrammarService.loadGrammarPoint(id).catch(() => null)));
            setRelated(points.filter(p => p !== null) as GrammarPoint[]);
        };
        load();
    }, [isExpanded, point]);

    if (relatedIds.length === 0) {
        return null;
    }

    return (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">
                Related Points <span className="text-sm font-normal text-tertiary ml-2">({relatedIds.length})</span>
            </h2>
            <div className="space-y-3">
                {related.map((p) => (
                    <div
                        key={p.id}
                        onClick={() => navigate(`/grammar/${p.id}`)}
                        className="border-l-2 border-divider pl-3 cursor-pointer hover:border-accent transition-colors group"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-mincho text-lg text-primary group-hover:text-accent transition-colors">
                                {p.title}
                            </span>
                            <JlptChip level={p.jlptLevel} />
                        </div>
                    </div>
                ))}
            </div>

            {isExpandable && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm font-gothic text-accent hover:text-accent/80 transition-colors py-2 px-4 rounded-md border border-accent/20 hover:bg-accent/5 w-full md:w-auto"
                    >
                        {isExpanded ? "Show fewer related points" : "Show all related points"}
                    </button>
                </div>
            )}
        </Card>
    );
}
