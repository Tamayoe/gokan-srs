import type { GrammarProgress, GrammarPoint } from "../models/grammar.model";

import { MasteryRing } from "./MasteryRing";
import { JlptChip } from "./JlptChip";
import { Card } from "./ui/Card";
import { CardContent } from "./ui/CardContent";

/** Grammar's equivalent of VocabCard, for SmartGrammarList's grid. */
export function GrammarCard({
  point,
  progress,
  onClick,
}: {
  point: GrammarPoint;
  progress: GrammarProgress;
  onClick?: () => void;
}) {
  function formatNextReview(date: Date | null): string {
    if (!date) return '-';

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs <= 0) return 'Now';

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `in ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `in ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `in ${days} d`;

    return date.toLocaleDateString();
  }

  return (
    <div
      onClick={onClick}
      className={`h-full transition-transform hover:scale-[1.02] active:scale-[0.98] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <Card className="h-full flex flex-col justify-between">
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-lg text-primary font-mincho">
                {point.title}
              </div>
              <div className="mt-1">
                <JlptChip level={point.jlptLevel} />
              </div>
            </div>

            <MasteryRing memoryStrength={progress.entry.memoryStrength} size={28} />
          </div>

          <div className="text-sm text-secondary line-clamp-2">
            {point.shortExplanation}
          </div>

          <div className="flex justify-between text-xs text-muted">
            <span>
              {progress.stage === "graduated"
                ? "Mastered"
                : `Reviews: ${progress.totalReviews}`}
            </span>
            <span>{formatNextReview(progress.nextReviewAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
