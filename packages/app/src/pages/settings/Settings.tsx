import { useState } from "react";
import { View, Text, ScrollView, Switch, TextInput, Pressable, ActivityIndicator, Image, Linking } from "react-native";
import { OptionGrid } from "../../components/OptionGrid";
import type { MeaningContextThreshold, UserSettings } from "@gokan-srs/core/models/user.model";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Icon } from "@gokan-srs/app/components/Icon";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../context/ThemeContext";
import { styles, THEME } from "@gokan-srs/ui";

function SyncControls() {
    const { login, logout, downloadProgress, isDownloading, isAuthenticated, user } = useGoogleDrive();

    if (!isAuthenticated) {
        return (
            <Button
                variant="secondary"
                onPress={() => login()}
                style={[styles.wFull, styles.justifyCenter]}
            >
                <Icon name="login" size={18} style={styles.mr2} />
                <Text>Sign in with Google</Text>
            </Button>
        );
    }

    return (
        <View style={[styles.flexCol, styles.gap3]}>
            <View style={[styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p4, { borderRadius: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', borderWidth: 1 }]}>
                <View style={[styles.flexRow, styles.alignCenter, styles.gap3]}>
                    {user?.picture && (
                        <Image
                            source={{ uri: user.picture }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                    )}
                    <View style={[styles.flexCol]}>
                        <View style={[styles.flexRow, styles.alignCenter, styles.gap2]}>
                            <Icon name="cloud" size={16} color="#16a34a" />
                            <Text style={[styles.textSm, styles.fontMedium, { color: '#15803d' }]}>
                                {user?.name || 'Connected to Google Drive'}
                            </Text>
                        </View>
                        {user?.email && (
                            <Text style={[styles.textXs, { color: 'rgba(22, 163, 74, 0.7)' }]}>
                                {user.email}
                            </Text>
                        )}
                    </View>
                </View>
                <Pressable onPress={() => logout()}>
                    {({ pressed }) => (
                        <Text style={[styles.textXs, styles.fontMedium, { color: pressed ? '#b91c1c' : THEME.colors.error }]}>
                            Disconnect
                        </Text>
                    )}
                </Pressable>
            </View>

            <Button
                variant="primary"
                onPress={() => downloadProgress()}
                disabled={isDownloading}
                style={[styles.wFull, styles.justifyCenter]}
            >
                {isDownloading ? (
                    <View style={[styles.flexRow, styles.alignCenter]}>
                        <ActivityIndicator color={THEME.colors.surface} style={styles.mr2} />
                        <Text style={styles.textWhite}>Syncing...</Text>
                    </View>
                ) : (
                    <View style={[styles.flexRow, styles.alignCenter]}>
                        <Icon name="refresh" size={18} color={THEME.colors.surface} style={styles.mr2} />
                        <Text style={styles.textWhite}>Sync Now</Text>
                    </View>
                )}
            </Button>
        </View>
    );
}

interface SettingsScreenProps {
    settings: UserSettings;
    onUpdateSettings: (settings: UserSettings) => void;
    onReset: () => void;
    onBack: () => void;
}

export function SettingsScreen({
    settings,
    onUpdateSettings,
    onReset,
    onBack,
}: SettingsScreenProps) {
    const { theme, setTheme } = useTheme();
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);

    return (
        <ScrollView style={[styles.flex1, styles.wFull, styles.bgBackground]} contentContainerStyle={[styles.alignCenter, styles.px4, styles.py6]}>
            <View style={[styles.wFull, { maxWidth: 768 }]}>

                {/* Header */}
                <View style={[styles.wFull, styles.flexRow, styles.alignCenter, styles.mb12, styles.relative, { height: 44 }]}>
                    <Button
                        variant="ghost"
                        onPress={onBack}
                        style={[styles.absolute, { left: 0, zIndex: 10 }]}
                    >
                        ← Back
                    </Button>

                    <Text style={[styles.flex1, styles.textCenter, styles.textXl, styles.fontSerif, styles.textPrimary]}>
                        Settings
                    </Text>
                </View>
                {/* Appearance */}
                <View style={[styles.wFull, styles.mb16]}>
                    <Text style={[styles.mb4, styles.fontGothic, styles.textSecondary, { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                        Appearance
                    </Text>

                    <View style={[styles.flexRow, styles.gap3]}>
                        <Button
                            variant={theme === "light" ? "primary" : "secondary"}
                            onPress={() => setTheme("light")}
                            style={[styles.flex1, styles.flexCol, styles.justifyCenter, styles.alignCenter, { height: 80 }]}
                        >
                            <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                <Icon name="white-balance-sunny" size={20} color={theme === "light" ? THEME.colors.surface : THEME.colors.primary} />
                                <Text style={[styles.textXs, theme === "light" ? styles.textWhite : styles.textPrimary]}>Light</Text>
                            </View>
                        </Button>
                        <Button
                            variant={theme === "dark" ? "primary" : "secondary"}
                            onPress={() => setTheme("dark")}
                            style={[styles.flex1, styles.flexCol, styles.justifyCenter, styles.alignCenter, { height: 80 }]}
                        >
                            <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                <Icon name="moon-waning-crescent" size={20} color={theme === "dark" ? THEME.colors.surface : THEME.colors.primary} />
                                <Text style={[styles.textXs, theme === "dark" ? styles.textWhite : styles.textPrimary]}>Dark</Text>
                            </View>
                        </Button>
                        <Button
                            variant={theme === "system" ? "primary" : "secondary"}
                            onPress={() => setTheme("system")}
                            style={[styles.flex1, styles.flexCol, styles.justifyCenter, styles.alignCenter, { height: 80 }]}
                        >
                            <View style={[styles.flexCol, styles.alignCenter, styles.gap2]}>
                                <Icon name="monitor" size={20} color={theme === "system" ? THEME.colors.surface : THEME.colors.primary} />
                                <Text style={[styles.textXs, theme === "system" ? styles.textWhite : styles.textPrimary]}>System</Text>
                            </View>
                        </Button>
                    </View>
                </View>

                {/* Learning preferences */}
                <View style={[styles.wFull, styles.mb16]}>
                    <Text style={[styles.mb4, styles.fontGothic, styles.textSecondary, { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                        Learning preferences
                    </Text>

                    <OptionGrid
                        title="Vocabulary order"
                        value={settings.preferredLearningOrder}
                        onChange={(value) =>
                            onUpdateSettings({
                                ...settings,
                                preferredLearningOrder: value as any,
                            })
                        }
                        options={[
                            {
                                value: 'kanji_coverage',
                                label: 'Kanji Coverage Priority',
                                description: (
                                    <Text style={[styles.fontMedium, { color: THEME.colors.accent }]}>
                                        <Icon name="star-four-points" size={14} color={THEME.colors.accent} />
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

                    {settings.preferredLearningOrder === 'kanji_coverage' && (
                        <View style={[styles.mt8, styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                            <View style={[styles.flexCol, styles.gap1, styles.mb4]}>
                                <Text style={[styles.fontMedium, styles.textPrimary]}>Target vocab per Kanji</Text>
                                <Text style={[styles.textSecondary, styles.textSm]}>
                                    How many words to learn for each kanji before prioritizing new kanji (1-5).
                                </Text>
                            </View>
                            <View style={[styles.flexRow, styles.alignCenter, styles.gap4]}>
                                <TextInput
                                    keyboardType="numeric"
                                    value={String(settings.kanjiCoverageTarget || 1)}
                                    onChangeText={(text) => {
                                        const parsed = parseInt(text, 10);
                                        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
                                            onUpdateSettings({
                                                ...settings,
                                                kanjiCoverageTarget: parsed,
                                            });
                                        }
                                    }}
                                    style={[
                                        styles.flex1,
                                        styles.px3,
                                        styles.py2,
                                        styles.bgBackground,
                                        styles.border,
                                        styles.textPrimary,
                                        { borderRadius: 6, borderColor: THEME.colors.divider }
                                    ]}
                                />
                                <Text style={[{ width: 32 }, styles.textCenter, styles.fontBold, styles.textPrimary]}>
                                    {settings.kanjiCoverageTarget || 1}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.mt8}>
                        <OptionGrid
                            title="Learning frequency"
                            value={settings.learningFrequency}
                            onChange={(value) =>
                                onUpdateSettings({
                                    ...settings,
                                    learningFrequency: value as any,
                                })
                            }
                            options={[
                                {
                                    value: 'high',
                                    label: 'High',
                                    description: 'Faster pace (more frequent)',
                                },
                                {
                                    value: 'medium',
                                    label: 'Medium (Default)',
                                    description: 'Balanced SRS intervals',
                                },
                                {
                                    value: 'low',
                                    label: 'Low',
                                    description: 'Relaxed pace (less frequent)',
                                },
                            ]}
                        />
                    </View>

                    <View style={[styles.mt8, styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                        <View style={[styles.flexCol, styles.gap1, styles.flex1, styles.pr4]}>
                            <Text style={[styles.fontMedium, styles.textPrimary]}>Enable Meaning Quizzes</Text>
                            <Text style={[styles.textSecondary, styles.textSm]}>
                                Test English meaning after reading (recommended)
                            </Text>
                        </View>
                        <Switch
                            value={settings.enableMeaningQuiz !== false}
                            onValueChange={(checked) =>
                                onUpdateSettings({
                                    ...settings,
                                    enableMeaningQuiz: checked,
                                })
                            }
                            trackColor={{ false: '#e2e8f0', true: THEME.colors.accent }}
                            thumbColor={'#ffffff'}
                        />
                    </View>

                    {settings.enableMeaningQuiz !== false && (
                        <View style={styles.mt6}>
                            <OptionGrid
                                title="Train meaning in context"
                                value={settings.meaningContextThreshold ?? 'normal'}
                                onChange={(value) =>
                                    onUpdateSettings({
                                        ...settings,
                                        meaningContextThreshold: value as MeaningContextThreshold,
                                    })
                                }
                                options={[
                                    {
                                        value: 'early',
                                        label: 'Early',
                                        description: 'Switch at 30% mastery',
                                    },
                                    {
                                        value: 'normal',
                                        label: 'Normal (Default)',
                                        description: 'Switch at 50% mastery',
                                    },
                                    {
                                        value: 'late',
                                        label: 'Late',
                                        description: 'Switch at 70% mastery',
                                    },
                                ]}
                            />
                        </View>
                    )}
                </View>

                {/* AI Features */}
                <View style={[styles.wFull, styles.mb16]}>
                    <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb4]}>
                        <Icon name="star-four-points" size={16} color={THEME.colors.secondary} />
                        <Text style={[styles.fontGothic, styles.textSecondary, { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                            AI Context Validation
                        </Text>
                    </View>

                    <Text style={[styles.textSm, styles.textSecondary, styles.mb6, styles.fontGothic, { lineHeight: 20 }]}>
                        Enhance your study sessions by allowing Gemini to validate meaning answers that aren't strictly in the dictionary, using the context of the example sentences.
                    </Text>

                    <View style={styles.gap4}>
                        <View style={[styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider, opacity: settings.enableMeaningQuiz === false ? 0.5 : 1 }]}>
                            <View style={[styles.flexCol, styles.gap1, styles.flex1, styles.pr4]}>
                                <Text style={[styles.fontMedium, styles.textPrimary]}>Enable Context-Aware Validation</Text>
                                <Text style={[styles.textSecondary, styles.textSm]}>
                                    Use AI during meaning quizzes that have a sentence context. Required for sentence quizzes.
                                </Text>
                            </View>
                            <Switch
                                disabled={settings.enableMeaningQuiz === false}
                                value={settings.enableGeminiContext === true}
                                onValueChange={(checked) =>
                                    onUpdateSettings({
                                        ...settings,
                                        enableGeminiContext: checked,
                                    })
                                }
                                trackColor={{ false: '#e2e8f0', true: THEME.colors.accent }}
                                thumbColor={'#ffffff'}
                            />
                        </View>

                        {settings.enableGeminiContext && (
                            <View style={[styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                                <View style={[styles.flexRow, styles.alignCenter, styles.gap2, styles.mb2]}>
                                    <Icon name="key" size={16} color={THEME.colors.tertiary} />
                                    <Text style={[styles.fontMedium, styles.textPrimary, styles.textSm, styles.fontGothic]}>
                                        Gemini API Key
                                    </Text>
                                </View>

                                <TextInput
                                    secureTextEntry
                                    value={settings.geminiApiKey || ''}
                                    onChangeText={(text) =>
                                        onUpdateSettings({
                                            ...settings,
                                            geminiApiKey: text
                                        })
                                    }
                                    placeholder="AIzaSy..."
                                    placeholderTextColor={THEME.colors.tertiary}
                                    style={[
                                        styles.wFull,
                                        styles.px3,
                                        styles.py2,
                                        styles.bgBackground,
                                        styles.border,
                                        styles.textPrimary,
                                        { borderRadius: 6, fontSize: 14, fontFamily: 'monospace', borderColor: THEME.colors.divider }
                                    ]}
                                />

                                <View style={[styles.mt3, styles.flexRow, styles.alignStart, styles.gap1]}>
                                    <Text style={[styles.textXs, styles.textTertiary]}>Note:</Text>
                                    <Text style={[styles.textXs, styles.textTertiary, styles.flex1]}>
                                        Your key is stored locally in your browser and is never sent to our servers. Get a free key from{' '}
                                        <Text onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')} style={{ color: THEME.colors.accent, textDecorationLine: 'underline' }}>
                                            Google AI Studio
                                        </Text>.
                                    </Text>
                                </View>
                            </View>
                        )}
                        
                        {settings.enableGeminiContext && (
                            <View style={[styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider, opacity: settings.enableMeaningQuiz === false ? 0.5 : 1 }]}>
                                <View style={[styles.flexCol, styles.gap1, styles.flex1, styles.pr4]}>
                                    <Text style={[styles.fontMedium, styles.textPrimary]}>AI Validation on All Answers</Text>
                                    <Text style={[styles.textSecondary, styles.textSm]}>
                                        When enabled, AI validates every answer in sentence quizzes. When disabled, AI only validates answers initially marked wrong or imprecise.
                                    </Text>
                                </View>
                                <Switch
                                    disabled={settings.enableMeaningQuiz === false}
                                    value={settings.alwaysUseAiForMeaningContext !== false}
                                    onValueChange={(checked) =>
                                        onUpdateSettings({
                                            ...settings,
                                            alwaysUseAiForMeaningContext: checked,
                                        })
                                    }
                                    trackColor={{ false: '#e2e8f0', true: THEME.colors.accent }}
                                    thumbColor={'#ffffff'}
                                />
                            </View>
                        )}
                    </View>
                </View>e)

                {/* Cloud Sync */}
                <View style={[styles.wFull, styles.mb16]}>
                    <Text style={[styles.mb4, styles.fontGothic, styles.textSecondary, { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                        Cloud Sync (Google Drive)
                    </Text>

                    <SyncControls />
                </View>

                {/* Danger zone */}
                <View style={[styles.wFull, styles.mb16]}>
                    <Text style={[styles.mb4, styles.fontGothic, { color: THEME.colors.errorAccent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                        Danger zone
                    </Text>

                    <View style={styles.flexCol}>
                        {!isConfirmingReset ? (
                            <Pressable
                                onPress={() => setIsConfirmingReset(true)}
                                style={({ pressed, hovered }: any) => [
                                    styles.flexCenter,
                                    styles.border,
                                    { height: 44, borderRadius: 6, borderColor: THEME.colors.error, backgroundColor: pressed || hovered ? THEME.colors.error : 'transparent' }
                                ] as any}
                            >
                                {({ pressed, hovered }: any) => (
                                    <Text style={[styles.fontSerif, styles.textBase, { color: pressed || hovered ? '#FFFFFF' : THEME.colors.error }]}>
                                        Reset all progress
                                    </Text>
                                )}
                            </Pressable>
                        ) : (
                            <View style={[styles.p4, styles.border, { borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                <Text style={[styles.textSm, styles.textCenter, styles.mb4, styles.fontMedium, styles.textError]}>
                                    Are you sure? This cannot be undone.
                                </Text>
                                <View style={[styles.flexRow, styles.gap3]}>
                                    <Button
                                        variant="secondary"
                                        onPress={() => setIsConfirmingReset(false)}
                                        style={[styles.flex1, styles.justifyCenter]}
                                    >
                                        Cancel
                                    </Button>
                                    <Pressable
                                        onPress={onReset}
                                        style={({ pressed, hovered }: any) => [
                                            styles.flex1,
                                            styles.flexCenter,
                                            { height: 44, borderRadius: 6, backgroundColor: THEME.colors.error, opacity: pressed || hovered ? 0.9 : 1 }
                                        ] as any}
                                    >
                                        <Text style={[styles.textWhite, styles.fontSerif, styles.textBase]}>
                                            Confirm Reset
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

            </View>
        </ScrollView>
    );
}