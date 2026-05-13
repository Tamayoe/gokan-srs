import React from "react";
import { View } from "react-native";
import { styles } from "@gokan-srs/ui";

export const CenteredCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={[styles.flex1, styles.flexCenter, styles.bgBackground, { padding: 32 }]}>
        <View style={[styles.border, styles.roundedMd, styles.bgSurface, { padding: 32, maxWidth: 448, width: '100%', alignItems: 'center' }]}>
            {children}
        </View>
    </View>
);