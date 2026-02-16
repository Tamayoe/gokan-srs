import { OptionGrid } from "../../components/OptionGrid";
import type { UserSettings } from "../../models/user.model";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Cloud, Loader2, LogIn, RefreshCw, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../context/ThemeContext";

function SyncControls() {
    const { login, logout, downloadProgress, isDownloading, isAuthenticated, user } = useGoogleDrive();

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
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                    {user?.picture && (
                        <img
                            src={user.picture}
                            alt="Profile"
                            className="w-10 h-10 rounded-full"
                        />
                    )}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Cloud size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                {user?.name || 'Connected to Google Drive'}
                            </span>
                        </div>
                        {user?.email && (
                            <span className="text-xs text-green-600/70 dark:text-green-400/70">
                                {user.email}
                            </span>
                        )}
                    </div>
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
                onClick={() => downloadProgress()}
                disabled={isDownloading}
                className="w-full justify-center"
            >
                {isDownloading ? (
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
        <div className="min-h-screen flex flex-col items-center bg-background transition-colors duration-200 max-w-2xl md:max-w-3xl">

            {/* Header */}
            <div className="w-full max-w-2xl md:w-3xl flex items-center mb-12 relative animate-fade-in">
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
            <section className="w-full mb-16 animate-slide-up" style={{ animationDelay: "100ms" }}>
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
            <section className="w-full mb-16 animate-slide-up" style={{ animationDelay: "200ms" }}>
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

                <div className="mt-8 flex items-center justify-between p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider">
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-primary">Enable Meaning Quizzes</span>
                        <span className="text-secondary text-sm">
                            Test English meaning after reading (recommended)
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.enableMeaningQuiz !== false}
                            onChange={(e) =>
                                onUpdateSettings({
                                    ...settings,
                                    enableMeaningQuiz: e.target.checked,
                                })
                            }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent"></div>
                    </label>
                </div>
            </section>

            {/* Cloud Sync */}
            <section className="w-full mb-16">
                <h2 className="mb-4 uppercase tracking-wide text-xs font-gothic text-secondary">
                    Cloud Sync (Google Drive)
                </h2>

                <div className="flex flex-col gap-4">
                    <SyncControls />
                </div>
            </section>

            {/* Danger zone */}
            <section className="w-full">
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