import { View, Text, Pressable, ScrollView } from "react-native";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
import { styles, THEME } from "@gokan-srs/ui";

type KanjiReferencePanelProps = {
    allKanji: string[];
};

export function KanjiField({
    allKanji,
}: KanjiReferencePanelProps) {
    const { state, toggleKanji } = useKanjiForm();
    return (
        <View style={[styles.wFull, styles.mt8, { maxWidth: 1024 }]}>
            <Text style={[styles.mb4, styles.fontGothic, styles.textSecondary, { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                Known kanji (KKLC order)
            </Text>

            <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingVertical: 8 }}
            >
                <View style={[styles.flexRow, styles.flexWrap, { gap: 16, justifyContent: 'flex-start' }]}>
                    {allKanji.map((kanji) => {
                        const isKnown = state.knownKanji.has(kanji);

                        return (
                            <Pressable
                                key={kanji}
                                onPress={() => toggleKanji(kanji)}
                                style={({ pressed, hovered }: any) => [
                                    styles.flexCenter,
                                    { width: 40, height: 40, borderRadius: 6 },
                                    isKnown
                                        ? { backgroundColor: THEME.colors.feedbackBackground }
                                        : { backgroundColor: pressed || hovered ? THEME.colors.surfaceHover : 'transparent' }
                                ] as any}
                            >
                                <Text style={[
                                    styles.fontMincho,
                                    styles.textLg,
                                    isKnown ? styles.textPrimary : styles.textTertiary
                                ]}>
                                    {kanji}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>

            <Text style={[styles.mt3, styles.textXs, styles.textSecondary, styles.fontSerif]}>
                Known kanji are softly highlighted. They are editable after you started learning
            </Text>
        </View>
    );
}