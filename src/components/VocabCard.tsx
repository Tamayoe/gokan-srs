import type { VocabProgress, Vocabulary } from "../models/vocabulary.model";

import { MasteryRing } from "./MasteryRing";
import { Card } from "./ui/Card";
import { CardContent } from "./ui/CardContent";

export function VocabCard({
  vocab,
  progress,
}: {
  vocab: Vocabulary;
  progress: VocabProgress;
}) {
  function formatNextReview(date: Date | null): string {
    if (!date) return '—';

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
    <Card>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-lg text-primary font-serif">
              {vocab.writtenForm.kanji}
            </div>

            <div className="text-sm text-secondary">
              {[vocab.reading.primary, ...vocab.reading.alternatives].join(" ・ ")}
            </div>
          </div>

          <MasteryRing mastery={progress.mastery} size={20} />
        </div>

        <div className="text-sm text-secondary">
          {vocab.senses[0]?.glosses.map(g => g).slice(0, 3).join(", ")}
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
  );
}
