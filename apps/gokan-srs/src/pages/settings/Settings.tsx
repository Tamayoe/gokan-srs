import { OptionGrid } from "../../components/OptionGrid";
import type { MeaningContextThreshold, UserSettings } from "../../models/user.model";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Cloud, Loader2, LogIn, RefreshCw, Moon, Sun, Monitor, Sparkles, KeyRound , ArrowLeft} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../context/ThemeContext";
import { useState } from "react";

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
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);



    return (
        <div className="min-h-screen flex flex-col items-center bg-background transition-colors duration-200 max-w-2xl md:max-w-3xl">

            {/* Header */}
            <div className="w-full max-w-2xl md:w-3xl flex items-center mb-12 relative animate-fade-in">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute left-0"
                >
                    <ArrowLeft className="inline-block w-4 h-4 mr-1 align-text-bottom" aria-hidden="true" />Back
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
                            value: 'kanji_coverage',
                            label: 'Kanji Coverage Priority',
                            description: (
                                <span className="flex items-center gap-1.5 text-accent font-medium">
                                    <Sparkles size={14} className="flex-shrink-0" />
                                    Recommended: Efficiently covers known kanji
                                </span>
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
                        {
                            value: 'jlpt',
                            label: 'JLPT Level',
                            description: 'N5 first, up to N1',
                        },
                    ]}
                />

                {settings.preferredLearningOrder !== 'kklc' && (
                    <div className="mt-6 flex items-center justify-between p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider">
                        <div className="flex flex-col gap-1 pr-4">
                            <span className="font-medium text-primary">Ignore known kanji requirement</span>
                            <span className="text-secondary text-sm">
                                Introduce vocabulary even if you haven't learned all of its kanji yet, applying the trade-off to the order selected above.
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.ignoreKnownKanjiRequirement === true}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        ...settings,
                                        ignoreKnownKanjiRequirement: e.target.checked,
                                    })
                                }
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent"></div>
                        </label>
                    </div>
                )}

                {settings.preferredLearningOrder === 'kanji_coverage' && (
                    <div className="mt-6 p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider">
                        <div className="flex flex-col gap-1 mb-4">
                            <span className="font-medium text-primary">Target vocab per Kanji</span>
                            <span className="text-secondary text-sm">
                                How many words to learn for each kanji before prioritizing new kanji (1-5).
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                value={settings.kanjiCoverageTarget || 1}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        ...settings,
                                        kanjiCoverageTarget: parseInt(e.target.value, 10),
                                    })
                                }
                                className="flex-1 h-2 bg-divider rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <span className="w-8 text-center font-bold text-primary">
                                {settings.kanjiCoverageTarget || 1}
                            </span>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <OptionGrid
                        title="Learning frequency"
                        value={settings.learningFrequency}
                        onChange={(value) =>
                            onUpdateSettings({
                                ...settings,
                                learningFrequency: value,
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
                </div>

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

                {settings.enableMeaningQuiz !== false && (
                    <div className="mt-6">
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
                    </div>
                )}
            </section>

            {/* AI Features */}
            <section className="w-full mb-16 animate-slide-up" style={{ animationDelay: "300ms" }}>
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-secondary" />
                    <h2 className="uppercase tracking-wide text-xs font-gothic text-secondary m-0">
                        AI Context Validation
                    </h2>
                </div>

                <p className="text-sm text-secondary mb-6 font-gothic">
                    Enhance your study sessions by allowing Gemini to validate meaning answers that aren't strictly in the dictionary, using the context of the example sentences.
                </p>

                <div className="space-y-4">
                    {/* Enable Toggle */}
                    <div className={`flex items-center justify-between p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider ${settings.enableMeaningQuiz === false ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col gap-1 pr-4">
                            <span className="font-medium text-primary">Enable Context-Aware Validation</span>
                            <span className="text-secondary text-xs sm:text-sm">
                                Use AI during meaning quizzes that have a sentence context. Required for sentence quizzes.
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.enableGeminiContext === true}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        ...settings,
                                        enableGeminiContext: e.target.checked,
                                    })
                                }
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent"></div>
                        </label>
                    </div>

                    {/* API Key Input */}
                    {settings.enableGeminiContext && (
                        <div className="p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider animate-fade-in-up">
                            <label className="flex items-center gap-2 mb-2 font-medium text-primary text-sm font-gothic">
                                <KeyRound size={16} className="text-tertiary" />
                                Gemini API Key
                            </label>

                            <input
                                type="password"
                                value={settings.geminiApiKey || ''}
                                onChange={(e) =>
                                    onUpdateSettings({
                                        ...settings,
                                        geminiApiKey: e.target.value
                                    })
                                }
                                placeholder="AIzaSy..."
                                className="w-full px-3 py-2 bg-background border border-divider rounded-md text-sm font-mono text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                            />

                            <div className="mt-3 text-xs text-tertiary flex items-start gap-1">
                                <span>Note:</span>
                                <span>
                                    Your key is stored locally in your browser and is never sent to our servers. Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google AI Studio</a>.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Validate All Correct Answers Toggle */}
                    {settings.enableGeminiContext && (
                        <div className={`flex items-center justify-between p-4 bg-surface dark:bg-surface/5 rounded-lg border border-divider animate-fade-in-up ${settings.enableMeaningQuiz === false ? 'opacity-50 pointer-events-none' : ''}`} style={{ animationDelay: "100ms" }}>
                            <div className="flex flex-col gap-1 pr-4">
                                <span className="font-medium text-primary">AI Validation on All Answers</span>
                                <span className="text-secondary text-xs sm:text-sm">
                                    When enabled, AI validates every answer in sentence quizzes. When disabled, AI only validates answers initially marked wrong or imprecise.
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.alwaysUseAiForMeaningContext !== false}
                                    disabled={settings.enableMeaningQuiz === false}
                                    onChange={(e) =>
                                        onUpdateSettings({
                                            ...settings,
                                            alwaysUseAiForMeaningContext: e.target.checked,
                                        })
                                    }
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent"></div>
                            </label>
                        </div>
                    )}
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

                <div className="flex flex-col gap-4">
                    {!isConfirmingReset ? (
                        <Button
                            onClick={() => setIsConfirmingReset(true)}
                            className="w-full justify-center bg-transparent border border-error text-error hover:bg-error hover:text-white transition-colors"
                        >
                            Reset all progress
                        </Button>
                    ) : (
                        <div className="p-4 rounded-lg bg-error/5 border border-error/20 animate-fade-in-up">
                            <p className="text-sm text-center mb-4 font-medium text-error">
                                Are you sure? This cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setIsConfirmingReset(false)}
                                    className="flex-1 justify-center bg-transparent border border-secondary text-secondary hover:text-primary hover:border-primary transition-colors"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onReset}
                                    className="flex-1 justify-center bg-error text-white border-transparent hover:brightness-110"
                                >
                                    Confirm Reset
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}