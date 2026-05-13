import { useState } from "react";
import { View, ScrollView, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CONSTANTS } from "@gokan-srs/core/commons/constants";
import type { LearningOrder } from "@gokan-srs/core/models/user.model";
import { OptionGrid } from "../../components/OptionGrid";
import { SetupHeader } from "../../components/SetupHeader";
import type { SetupValues } from "@gokan-srs/core/models/state.model";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useKanjiForm } from "../../context/KanjiForm/useKanjiForm";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/Loader";
import { styles, THEME } from "@gokan-srs/ui";

export function SetupScreen({ onComplete }: { onComplete: (values: SetupValues) => Promise<void> }) {
    const { state } = useKanjiForm();

    const [learningOrder, setLearningOrder] = useState<LearningOrder>('kanji_coverage');

    const handleSubmit = () => {
        if (
            state.kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            state.kanjiCount <= CONSTANTS.setup.maximumKanjiCount
        ) {
            const values: SetupValues = {
                kanjiKnowledge: {
                    method: state.kanjiMethod,
                    step: state.kanjiCount,
                    kanjiSet: new Set(state.knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                    kanjiCoverageTarget: 1,
                    enableMeaningQuiz: true, // Default to true
                    learningFrequency: 'medium',
                },
            }
            onComplete(values).then();
        }
    };

    if (state.loading) {
        return (<Loader title="Loading..." />)
    }

    return (
        <View style={[styles.flex1, styles.bgBackground]}>
            <ScrollView contentContainerStyle={[styles.flexGrow, styles.alignCenter, styles.justifyCenter, styles.p8]}>
                <View style={[styles.wFull, styles.flexCol, styles.gap12, { maxWidth: 768 }]}>
                    <SetupHeader />

                    <KanjiKnowledgeEditor />

                    <OptionGrid<LearningOrder>
                        title="Vocabulary order"
                        value={learningOrder}
                        onChange={setLearningOrder}
                        options={[
                            {
                                value: 'kanji_coverage',
                                label: 'Kanji Coverage Priority',
                                description: (
                                    <Text style={[styles.fontMedium, { color: THEME.colors.accent }]}>
                                        <MaterialCommunityIcons name="star-four-points" size={14} color={THEME.colors.accent} />
                                        {' '}Recommended: Efficiently covers known kanji
                                    </Text>
                                ),
                            },
                            {
                                value: 'frequency',
                                label: 'Frequency',
                                description: 'Most common words first',
                            },
                            {
                                value: 'kklc',
                                label: 'By Kanji',
                                description: 'Follow kanji progression',
                            },
                        ]}
                    />

                    <View style={[styles.pt4, styles.flexCol, styles.gap4]}>
                        <Button
                            variant="primary"
                            onPress={handleSubmit}
                            disabled={!state.knownKanji}
                            style={[styles.wFull, styles.h14]}
                            textStyle={[styles.textLg, styles.fontSerif]}
                        >
                            Start learning
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
