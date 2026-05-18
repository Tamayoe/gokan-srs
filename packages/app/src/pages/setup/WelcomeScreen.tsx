import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { StorageService } from "@gokan-srs/core/services/storage.service";
import { Button } from "../../components/ui/Button";
import { Icon } from "@gokan-srs/app/components/Icon";
import { styles, THEME } from "@gokan-srs/ui";

export function GoogleLoginButton({ onSyncComplete, style }: { onSyncComplete: () => void, style?: any }) {
    const { login, isDownloading, isAuthenticated, downloadProgress } = useGoogleDrive();
    const [hasAttemptedAutoRestore, setHasAttemptedAutoRestore] = useState(false);

    useEffect(() => {
        let mounted = true;
        const tryRestore = async () => {
            if (isAuthenticated && !isDownloading) {
                if (StorageService.loadProgress()) {
                    onSyncComplete();
                    return;
                }

                if (!hasAttemptedAutoRestore) {
                    setHasAttemptedAutoRestore(true);
                    await downloadProgress();
                    if (mounted) {
                        onSyncComplete();
                    }
                }
            }
        };
        tryRestore();
        return () => { mounted = false; };
    }, [isAuthenticated, isDownloading, hasAttemptedAutoRestore, downloadProgress, onSyncComplete]);

    if (isDownloading) {
        return (
            <View style={[styles.flexRow, styles.alignCenter, styles.justifyCenter, styles.gap2, styles.px4, styles.py2, style]}>
                <Icon name="loading" size={16} color={THEME.colors.primary} style={{ opacity: 0.5 }} />
                <Text style={[styles.textSm, { color: THEME.colors.primary, opacity: 0.8 }]}>Restoring your progress...</Text>
            </View>
        );
    }

    if (isAuthenticated) {
        return (
            <Button
                variant="ghost"
                onPress={async () => {
                    await downloadProgress();
                    onSyncComplete();
                }}
                style={[styles.wFull, style]}
                textStyle={[styles.textSm, styles.fontMedium]}
            >
                <Icon name="cloud" size={16} color={THEME.colors.primary} style={styles.mr2} />
                Retry Restore
            </Button>
        )
    }

    return (
        <Button
            variant="secondary"
            onPress={() => login()}
            style={[styles.wFull, style]}
            textStyle={[styles.textSm, styles.fontMedium]}
        >
            <Icon name="login" size={16} color={THEME.colors.primary} style={styles.mr2} />
            Already have an account? Log in to restore
        </Button>
    );
}

interface WelcomeScreenProps {
    onSelectBeginner: () => void;
    onSelectLearner: () => void;
}

export function WelcomeScreen({ onSelectBeginner, onSelectLearner }: WelcomeScreenProps) {
    return (
        <View style={[styles.flex1, styles.bgBackground, styles.overflowHidden, styles.relative]}>
            {/* Subtle floating background elements */}
            <View style={[styles.absolute, { top: -50, right: -50, zIndex: 0, opacity: 0.05 }]} pointerEvents="none">
                <Text style={[styles.fontMincho, styles.textPrimary, { fontSize: 200 }]}>語感</Text>
            </View>

            <ScrollView contentContainerStyle={[styles.flexGrow, styles.alignCenter, styles.justifyCenter, styles.p4, { zIndex: 10, paddingVertical: 48 }]}>
                <View style={[styles.wFull, styles.flexCol, styles.gap12, { maxWidth: 672 }]}>
                    {/* Header & Philosophy */}
                    <View style={[styles.flexCol, styles.alignCenter, styles.gap6]}>
                        <Text style={[styles.text4xl, styles.fontMincho, styles.textPrimary, styles.textCenter, { lineHeight: 48 }]}>
                            Welcome to Gokan
                        </Text>
                        <View style={[styles.flexCol, styles.alignCenter, styles.gap4, { maxWidth: 576 }]}>
                            <Text style={[styles.textSecondary, styles.fontSerif, styles.textCenter, { lineHeight: 24 }]}>
                                <Text style={styles.fontBold}>Gokan</Text> (語感) means "sense of language". This application is a serious study instrument designed to help you truly acquire Japanese vocabulary, not just memorize flashcards.
                            </Text>

                            <View style={[styles.flexRow, styles.flexWrap, styles.justifyCenter, styles.gap6, styles.pt6, styles.wFull]}>
                                <View style={[styles.flexCol, styles.alignCenter, styles.gap2, { flex: 1, minWidth: 150 }]}>
                                    <View style={[styles.flexCenter, styles.w10, styles.h10, styles.bgSurface, styles.border, { borderRadius: 20, borderColor: THEME.colors.divider }]}>
                                        <Icon name="cloud" size={18} color={THEME.colors.primary} />
                                    </View>
                                    <Text style={[styles.fontBold, styles.textPrimary, styles.textCenter]}>Daily SRS</Text>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.textCenter]}>A custom Spaced Repetition System optimized for long-term retention.</Text>
                                </View>
                                <View style={[styles.flexCol, styles.alignCenter, styles.gap2, { flex: 1, minWidth: 150 }]}>
                                    <View style={[styles.flexCenter, styles.w10, styles.h10, styles.bgSurface, styles.border, { borderRadius: 20, borderColor: THEME.colors.divider }]}>
                                        <Icon name="school" size={18} color={THEME.colors.primary} />
                                    </View>
                                    <Text style={[styles.fontBold, styles.textPrimary, styles.textCenter]}>Contextual Meaning</Text>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.textCenter]}>Learn nuance by translating vocabulary within real Japanese sentences.</Text>
                                </View>
                                <View style={[styles.flexCol, styles.alignCenter, styles.gap2, { flex: 1, minWidth: 150 }]}>
                                    <View style={[styles.flexCenter, styles.w10, styles.h10, styles.bgSurface, styles.border, { borderRadius: 20, borderColor: THEME.colors.divider }]}>
                                        <Icon name="book-open-variant" size={18} color={THEME.colors.primary} />
                                    </View>
                                    <Text style={[styles.fontBold, styles.textPrimary, styles.textCenter]}>Read Native Material</Text>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.textCenter]}>The bridge between textbook kanji and reading actual Japanese media.</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Path Selection */}
                    <View style={[styles.flexCol, styles.gap4, styles.pt4]}>
                        <Text style={[styles.textSm, styles.fontGothic, styles.textTertiary, styles.textCenter, styles.mb2, { textTransform: 'uppercase', letterSpacing: 1 }]}>
                            Choose your path
                        </Text>

                        <View style={[styles.flexCol, styles.gap4]}>
                            <Pressable
                                onPress={onSelectBeginner}
                                style={({ pressed, hovered }: any) => [
                                    styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p6, styles.bgSurface, styles.border,
                                    {
                                        borderRadius: 12,
                                        borderColor: pressed || hovered ? THEME.colors.accent + '66' : THEME.colors.divider,
                                        backgroundColor: pressed ? THEME.colors.surfaceHover : THEME.colors.surface,
                                        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)'
                                    }
                                ] as any}
                            >
                                <View style={[styles.flex1, styles.pr4]}>
                                    <Text style={[styles.fontBold, styles.textLg, styles.textPrimary, styles.fontGothic, styles.mb1]}>
                                        Complete Beginner
                                    </Text>
                                    <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif, { lineHeight: 20 }]}>
                                        I don't know any Kanji yet. Start me from the very beginning with the Kodansha (KKLC) order.
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color={THEME.colors.tertiary} />
                            </Pressable>

                            <Pressable
                                onPress={onSelectLearner}
                                style={({ pressed, hovered }: any) => [
                                    styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p6, styles.bgSurface, styles.border,
                                    {
                                        borderRadius: 12,
                                        borderColor: pressed || hovered ? THEME.colors.accent + '66' : THEME.colors.divider,
                                        backgroundColor: pressed ? THEME.colors.surfaceHover : THEME.colors.surface,
                                        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)'
                                    }
                                ] as any}
                            >
                                <View style={[styles.flex1, styles.pr4]}>
                                    <Text style={[styles.fontBold, styles.textLg, styles.textPrimary, styles.fontGothic, styles.mb1]}>
                                        Kanji Learner
                                    </Text>
                                    <Text style={[styles.textSm, styles.textSecondary, styles.fontSerif, { lineHeight: 20 }]}>
                                        I already know some Kanji. Let me tailor my vocabulary queue to strictly introduce words using my known Kanji.
                                    </Text>
                                </View>
                                <Icon name="chevron-right" size={24} color={THEME.colors.tertiary} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Load Existing */}
                    <View style={[styles.pt8, styles.border, styles.wFull, styles.alignCenter, { borderTopWidth: 1, borderColor: THEME.colors.divider }]}>
                        <View style={{ width: '100%', maxWidth: 384 }}>
                            <GoogleLoginButton onSyncComplete={() => window.location.reload()} />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
