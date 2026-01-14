import {VocabularyService} from "../services/vocabulary.service";
import type {VocabProgress, Vocabulary} from "../models/vocabulary.model";
import {useEffect, useState} from "react";
import {VocabCard} from "./VocabCard";
import {THEME} from "../commons/theme";

export function VocabCardLoader({ progress }: { progress: VocabProgress }) {
  const [vocab, setVocab] = useState<Vocabulary | null>(null);

  useEffect(() => {
    let cancelled = false;

    VocabularyService.loadVocab(progress.vocabId).then(v => {
      if (!cancelled) setVocab(v);
    });

    return () => {
      cancelled = true;
    };
  }, [progress.vocabId]);

  if (!vocab) {
    return <VocabCardSkeleton />;
  }

  return <VocabCard vocab={vocab} progress={progress} />;
}

function VocabCardSkeleton() {
  return (
      <div
          className="rounded-lg p-4 animate-pulse"
          style={{
            backgroundColor: THEME.colors.surface,
            border: `1px solid ${THEME.colors.divider}`,
          }}
      >
        <div className="h-4 w-24 mb-2 bg-gray-300 rounded" />
        <div className="h-3 w-32 mb-3 bg-gray-300 rounded" />
        <div className="h-3 w-full bg-gray-300 rounded" />
      </div>
  );
}