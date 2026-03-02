import React from "react";
import { View, Text } from "react-native";
import { CenteredCard } from "./CenteredCard";
import { Button } from "./ui/Button";
import { styles } from "@gokan-srs/ui";

interface WaitingScreenProps {
    nextReviewAt: Date;
    onLearnMore: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
    nextReviewAt,
    onLearnMore,
}) => {
    const minutes = Math.max(
        1,
        Math.ceil((nextReviewAt.getTime() - Date.now()) / 60000)
    );

    return (
        <CenteredCard>
            <Text style={[styles.textXl, styles.mb4, styles.textPrimary, styles.fontSerif]}>
                You’re done for now ✨
            </Text>

            <Text style={[styles.textSm, styles.mb6, styles.textSecondary, styles.fontSerif]}>
                Your next review will be available in{' '}
                <Text style={styles.fontBold}>{minutes} minute{minutes > 1 ? 's' : ''}</Text>.
            </Text>

            <View style={[styles.flexCol, styles.gap3]}>
                <Button variant="primary" onPress={onLearnMore}>
                    Learn more words
                </Button>

                <Text style={[styles.textXs, styles.textCenter, styles.textSecondary, styles.mt3]}>
                    Recommended daily limit reached
                </Text>
            </View>
        </CenteredCard>
    );
};