import { ActivityIndicator, Text, View } from 'react-native';
import { styles, THEME } from '@gokan-srs/ui';

export function LoadingScreen() {
    return (
        <View style={[styles.flex1, styles.flexCenter, styles.bgBackground]}>
            <ActivityIndicator size="large" color={THEME.colors.primary} style={styles.mb4} />
            <Text style={[styles.textSecondary, styles.fontGothic]}>Loading vocabulary...</Text>
        </View>
    );
}
