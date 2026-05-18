import { VocabularyService } from "@gokan-srs/core/services/vocabulary.service";
import type { VocabProgress, Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { useEffect, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { VocabCard } from "./VocabCard";
import { THEME } from "@gokan-srs/ui";

export function VocabCardLoader({ progress, onClick }: { progress: VocabProgress; onClick?: (vocabId: string) => void }) {
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

  return <VocabCard vocab={vocab} progress={progress} onClick={() => onClick?.(progress.vocabId)} />;
}

export function VocabCardSkeleton() {
  const [fadeAnim] = useState(new Animated.Value(0.5));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[skeletonStyles.container, { opacity: fadeAnim }]}>
      <View style={skeletonStyles.title} />
      <View style={skeletonStyles.subtitle} />
      <View style={skeletonStyles.body} />
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.divider,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
  },
  title: {
    height: 16,
    width: 96,
    marginBottom: 8,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
  },
  subtitle: {
    height: 12,
    width: 128,
    marginBottom: 12,
    backgroundColor: '#d1d5db',
    borderRadius: 4,
  },
  body: {
    height: 12,
    width: '100%',
    backgroundColor: '#d1d5db',
    borderRadius: 4,
  },
});