import React from "react";
import { Text } from "react-native";
import { CenteredCard } from "./CenteredCard";
import { styles } from "@gokan-srs/ui";

export const ExhaustedScreen: React.FC = () => {
    return (
        <CenteredCard>
            <Text style={[styles.textXl, styles.mb4, styles.textPrimary, styles.fontSerif]}>
                All caught up 🎉
            </Text>

            <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif]}>
                Come back tomorrow.
            </Text>
        </CenteredCard>
    );
};
