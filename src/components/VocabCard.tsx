import type {VocabProgress, Vocabulary} from "../models/vocabulary.model";
import {THEME} from "../commons/theme";
import {MasteryRing} from "./MasteryRing";

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
    <div
      className="rounded-lg p-4 transition-colors hover:bg-opacity-80"
      style={{
        backgroundColor: THEME.colors.surface,
        border: `1px solid ${THEME.colors.divider}`,
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div
            className="text-lg"
            style={{
              color: THEME.colors.primary,
              fontFamily: THEME.fonts.serif,
            }}
          >
            {vocab.kanji}
          </div>

          <div
            className="text-sm"
            style={{ color: THEME.colors.secondary }}
          >
            {vocab.readings.join(' ・ ')}
          </div>
        </div>

        <MasteryRing mastery={progress.mastery} size={20} />
      </div>

      <div
        className="mt-2 text-sm"
        style={{ color: THEME.colors.secondary }}
      >
        {vocab.meanings.slice(0, 3).join(', ')}
      </div>

      <div
        className="mt-3 flex justify-between text-xs"
        style={{ color: THEME.colors.muted }}
      >
        <span>
          {progress.stage === 'graduated'
            ? 'Mastered'
            : `Reviews: ${progress.totalReviews}`}
        </span>

        <span>
          {formatNextReview(progress.nextReviewAt)}
        </span>
      </div>
    </div>
  );
}
