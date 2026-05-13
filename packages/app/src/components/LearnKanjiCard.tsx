import { View, Text } from "react-native";
import { Card } from "./ui/Card";
import { CardSection } from "./ui/CardSection";
import { Button } from "./ui/Button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "@gokan-srs/ui";

interface LearnKanjiCardProps {
    nextKanji: { step: number; kanjis: string[] };
    onUnlock: () => void;
}

export function LearnKanjiCard({ nextKanji, onUnlock }: LearnKanjiCardProps) {
    return (
        <Card size="lg">
            <CardSection>
                <View style={[styles.flexCol, styles.alignCenter, styles.gap4]}>
                    <Text style={[styles.textSm, styles.fontGothic, styles.textSecondary, { textTransform: 'uppercase', letterSpacing: 1 }]}>
                        New Kanji Unlocked
                    </Text>

                    <View style={[styles.flexRow, styles.justifyCenter, styles.alignCenter, styles.gap4]}>
                        {nextKanji.kanjis.map((k, idx) => (
                            <Text
                                key={idx}
                                style={[styles.textPrimary, styles.fontMincho, { fontSize: 96, lineHeight: 110 }]}
                            >
                                {k}
                            </Text>
                        ))}
                    </View>

                    <Text style={[styles.textTertiary, styles.fontGothic, styles.textSm, styles.pt4]}>
                        Step {nextKanji.step}
                    </Text>
                </View>
            </CardSection>

            <View style={[styles.px6, styles.pb6, styles.pt2]}>
                <Button
                    variant="primary"
                    style={[styles.wFull]}
                    onPress={onUnlock}
                >
                    <MaterialCommunityIcons name="lock-open" size={20} color="#FFFFFF" />
                    {' '}Unlock and Learn Vocab
                </Button>
            </View>
        </Card>
    );
}
