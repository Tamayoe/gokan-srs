import { View, Text, TextInput } from "react-native";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
import { styles, THEME } from "@gokan-srs/ui";

export function KanjiCountInput() {
    const { state, setKanjiCount } = useKanjiForm();

    return (
        <View style={[styles.mt8, styles.gap3]}>
            <Text style={[styles.textSm, styles.fontGothic, styles.textSecondary, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                Known Kanji Count
            </Text>
            <TextInput
                keyboardType="numeric"
                value={state.kanjiCount.toString()}
                onChangeText={text => {
                    const parsed = parseInt(text, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                        setKanjiCount(parsed);
                    } else if (text === '') {
                        setKanjiCount(0);
                    }
                }}
                style={[
                    styles.wFull,
                    styles.border,
                    styles.bgSurface,
                    styles.textPrimary,
                    styles.fontGothic,
                    { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, borderColor: THEME.colors.divider }
                ]}
                placeholderTextColor={THEME.colors.tertiary}
            />
        </View>
    );
}