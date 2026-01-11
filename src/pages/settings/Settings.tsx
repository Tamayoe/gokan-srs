import {THEME} from "../../commons/theme";
import {OptionGrid} from "../../components/OptionGrid";
import type {UserSettings} from "../../models/user.model";

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
    return (
        <div
            className="min-h-screen flex flex-col items-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >

            {/* Header */}
            <div className="w-full max-w-2xl flex items-center mb-12">
                <button
                    onClick={onBack}
                    className="text-sm"
                    style={{
                        color: THEME.colors.secondary,
                        fontFamily: THEME.fonts.gothic,
                    }}
                >
                    ← Back
                </button>

                <h1
                    className="flex-1 text-center text-xl"
                    style={{
                        color: THEME.colors.primary,
                        fontFamily: THEME.fonts.serif,
                    }}
                >
                    Settings
                </h1>
            </div>

            {/* Learning preferences */}
            <section className="w-full max-w-2xl mb-16">
                <h2
                    className="mb-4 uppercase tracking-wide text-xs"
                    style={{
                        color: THEME.colors.secondary,
                        fontFamily: THEME.fonts.gothic,
                    }}
                >
                    Learning preferences
                </h2>

                <OptionGrid
                    title="Vocabulary order"
                    value={settings.preferredLearningOrder}
                    onChange={(value) =>
                        onUpdateSettings({
                            ...settings,
                            preferredLearningOrder: value,
                        })
                    }
                    options={[
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
            </section>

            {/* Danger zone */}
            <section className="w-full max-w-2xl">
                <h2
                    className="mb-4 uppercase tracking-wide text-xs"
                    style={{
                        color: THEME.colors.errorAccent,
                        fontFamily: THEME.fonts.gothic,
                    }}
                >
                    Danger zone
                </h2>

                <button
                    onClick={onReset}
                    className="w-full border rounded px-4 py-3 text-sm"
                    style={{
                        borderColor: THEME.colors.errorAccent,
                        color: THEME.colors.errorAccent,
                        fontFamily: THEME.fonts.serif,
                    }}
                >
                    Reset all progress
                </button>
            </section>
        </div>
    );
}