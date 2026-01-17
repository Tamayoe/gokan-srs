import { THEME } from "../../commons/theme";
import { OptionGrid } from "../../components/OptionGrid";
import type { UserSettings } from "../../models/user.model";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Cloud, Loader2, LogIn, RefreshCw } from "lucide-react";

function SyncControls() {
    const { login, logout, sync, isSyncing, isAuthenticated } = useGoogleDrive();

    if (!isAuthenticated) {
        return (
            <button
                onClick={() => login()}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg border transition-colors hover:bg-black/5"
                style={{
                    borderColor: THEME.colors.secondary,
                    color: THEME.colors.primary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                <LogIn size={18} />
                Sign in with Google
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 border border-green-100">
                <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-green-600" />
                    <span className="text-sm text-green-800">Connected to Google Drive</span>
                </div>
                <button
                    onClick={() => logout()}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                    Disconnect
                </button>
            </div>

            <button
                onClick={() => sync()}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-black text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                style={{
                    fontFamily: THEME.fonts.serif,
                }}
            >
                {isSyncing ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Syncing...
                    </>
                ) : (
                    <>
                        <RefreshCw size={18} />
                        Sync Now
                    </>
                )}
            </button>
        </div>
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

            {/* Cloud Sync */}
            <section className="w-full max-w-2xl mb-16">
                <h2
                    className="mb-4 uppercase tracking-wide text-xs"
                    style={{
                        color: THEME.colors.secondary,
                        fontFamily: THEME.fonts.gothic,
                    }}
                >
                    Cloud Sync (Google Drive)
                </h2>

                <div className="flex flex-col gap-4">
                    <SyncControls />
                </div>
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