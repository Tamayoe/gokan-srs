import { View, Text } from "react-native";
import type { VocabProgress, Vocabulary } from "@gokan-srs/core/models/vocabulary.model";

import { MasteryRing } from "./MasteryRing";
import { Card } from "./ui/Card";
import { CardContent } from "./ui/CardContent";
import { styles } from "@gokan-srs/ui";

export function VocabCard({
  vocab,
  progress,
  onClick,
}: {
  vocab: Vocabulary;
  progress: VocabProgress;
  onClick?: () => void;
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
    <View style={[{ height: '100%' }]}>
      <Card onPress={onClick} interactive={!!onClick} style={[styles.hFull, styles.flexCol, styles.justifyBetween]}>
        <CardContent style={[styles.flexCol, styles.gap3]}>
          <View style={[styles.flexRow, styles.justifyBetween, styles.alignStart]}>
            <View>
              <Text style={[styles.textLg, styles.textPrimary, styles.fontSerif]}>
                {vocab.writtenForm.kanji}
              </Text>

              <Text style={[styles.textSm, styles.textSecondary]}>
                {[vocab.reading.primary, ...vocab.reading.alternatives].join(" ・ ")}
              </Text>
            </View>

            <View style={[styles.flexRow, styles.gap1]}>
              <View style={[styles.flexCol, styles.alignCenter]}>
                <MasteryRing memoryStrength={progress.reading.memoryStrength} size={20} variant="reading" />
              </View>
              <View style={[styles.flexCol, styles.alignCenter]}>
                <MasteryRing memoryStrength={progress.meaning.memoryStrength} size={20} variant="meaning" />
              </View>
            </View>
          </View>

          <Text style={[styles.textSm, styles.textSecondary]}>
            {vocab.senses[0]?.glosses.map(g => g).slice(0, 3).join(", ")}
          </Text>

          <View style={[styles.flexRow, styles.justifyBetween]}>
            <Text style={[styles.textXs, styles.textMuted]}>
              {progress.stage === "graduated"
                ? "Mastered"
                : `Reviews: ${progress.totalReviews}`}
            </Text>
            <Text style={[styles.textXs, styles.textMuted]}>{formatNextReview(progress.nextReviewAt)}</Text>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
