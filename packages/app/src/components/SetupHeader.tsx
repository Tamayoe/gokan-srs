import { View, Text } from "react-native";
import { styles } from "@gokan-srs/ui";
import { Logo } from "./Logo";

export function SetupHeader() {
    return (
        <View style={[styles.flexCol, styles.alignCenter, styles.mb16]}>
            <View style={[styles.flexRow, styles.justifyCenter, styles.mb6]}>
                <Logo />
            </View>
            <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif, styles.textCenter]}>
                A focused vocabulary learning system
            </Text>
        </View>
    );
}