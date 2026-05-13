import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { styles } from "@gokan-srs/ui";

export const Stat = ({ value, label, color }: { value: ReactNode, label: string, color: string }) => (
    <View style={[styles.flexCol, styles.alignCenter]}>
        <Text style={[styles.text2xl, styles.fontSerif, styles.mb1, { color }]}>
            {value}
        </Text>
        <Text style={[styles.textXs, styles.textSecondary, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            {label}
        </Text>
    </View>
);
