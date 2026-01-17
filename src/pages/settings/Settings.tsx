import { OptionGrid } from "../../components/OptionGrid";
import type { UserSettings } from "../../models/user.model";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Cloud, Loader2, LogIn, RefreshCw, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../context/ThemeContext";

function SyncControls() {
    const { login, logout, sync, isSyncing, isAuthenticated } = useGoogleDrive();

    if (!isAuthenticated) {
        return (
            <Button
                variant="secondary"
                onClick={() => login()}
                className="w-full justify-center"
            >
                <LogIn size={18} className="mr-2" />
                Sign in with Google
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">Connected to Google Drive</span>
                </div>
                <button
                    onClick={() => logout()}
                    className="text-xs text-error hover:text-red-700 font-medium cursor-pointer"
                >
                    Disconnect
                </button>
            </div>

            <Button
                variant="primary"
                onClick={() => sync()}
                disabled={isSyncing}
                className="w-full justify-center"
            >
                {isSyncing ? (
                    <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Syncing...
                    </>
                ) : (
                    <>
                        <RefreshCw size={18} className="mr-2" />
                        Sync Now
                    </>
                )}
            </Button>
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
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col items-center p-8 bg-background transition-colors duration-200">

            {/* Header */}
            <div className="w-full max-w-2xl flex items-center mb-12 relative animate-fade-in">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute left-0"
                >
                    ← Back
                </Button>

                <h1 className="flex-1 text-center text-xl font-serif text-primary">
                    Settings
                </h1>
            </div>

            {/* Appearance */}
            <section className="w-full max-w-2xl mb-16 animate-slide-up" style={{ animationDelay: "100ms" }}>
                <h2 className="mb-4 uppercase tracking-wide text-xs font-gothic text-secondary">
                    Appearance
                </h2>

                <div className="grid grid-cols-3 gap-3">
                    <Button
                        variant={theme === "light" ? "primary" : "secondary"}
                        onClick={() => setTheme("light")}
                        className="flex flex-col h-20 gap-2"
                    >
                        <Sun size={20} />
                        <span className="text-xs">Light</span>
                    </Button>
                    <Button
                        variant={theme === "dark" ? "primary" : "secondary"}
                        onClick={() => setTheme("dark")}
                        className="flex flex-col h-20 gap-2"
                    >
                        <Moon size={20} />
                        <span className="text-xs">Dark</span>
                    </Button>
                    <Button
                        variant={theme === "system" ? "primary" : "secondary"}
                        onClick={() => setTheme("system")}
                        className="flex flex-col h-20 gap-2"
                    >
                        <Monitor size={20} />
                        <span className="text-xs">System</span>
                    </Button>
                </div>
            </section>

            {/* Learning preferences */}
            <section className="w-full max-w-2xl mb-16 animate-slide-up" style={{ animationDelay: "200ms" }}>
                <h2 className="mb-4 uppercase tracking-wide text-xs font-gothic text-secondary">
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
                <h2 className="mb-4 uppercase tracking-wide text-xs font-gothic text-secondary">
                    Cloud Sync (Google Drive)
                </h2>

                <div className="flex flex-col gap-4">
                    <SyncControls />
                </div>
            </section>

            {/* Danger zone */}
            <section className="w-full max-w-2xl">
                <h2 className="mb-4 uppercase tracking-wide text-xs font-gothic text-error-accent">
                    Danger zone
                </h2>

                <Button
                    onClick={onReset}
                    className="w-full bg-transparent border-error-accent text-error hover:bg-error/5"
                >
                    Reset all progress
                </Button>
            </section>
        </div>
    );
}