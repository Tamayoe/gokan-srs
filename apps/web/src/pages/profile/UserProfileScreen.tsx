import { View, Text, ScrollView } from 'react-native';
import { Button } from "../../components/ui/Button";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useQuiz } from "../../context/useQuiz";
import { styles } from "@gokan-srs/ui";

export function UserProfileScreen({ onBack }: { onBack: () => void; onVocabClick?: (vocabId: string) => void }) {
    const { actions } = useQuiz();

    return (
        <ScrollView style={[styles.flex1, styles.wFull, styles.bgBackground]} contentContainerStyle={[styles.alignCenter, styles.px4, styles.py6]}>
            <View style={[styles.wFull, styles.flexCol, styles.gap2, { maxWidth: 768 }]}>
                {/* Header */}
                <View style={[styles.wFull, styles.mb6, styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.relative, { height: 48 }]}>
                    <Button
                        variant="ghost"
                        onPress={onBack}
                        style={[styles.absolute, { left: 0, zIndex: 10 }]}
                    >
                        ← Back
                    </Button>

                    <Text style={[styles.textXl, styles.fontSerif, styles.textPrimary]}>
                        Your learning
                    </Text>
                </View>

                <View style={[styles.wFull, styles.mt8]}>
                    <Text style={[styles.textLg, styles.mb4, styles.textPrimary, styles.fontSerif]}>
                        Kanji
                    </Text>

                    <KanjiKnowledgeEditor onKanjiKnowledgeChange={actions.updateKanjiKnowledge} />
                </View>
            </View>
        </ScrollView>
    );
}
