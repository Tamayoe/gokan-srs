import { useState, useEffect } from "react";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { StorageService } from "../../services/storage.service";
import { Button } from "../../components/ui/Button";
import { Cloud, Loader2, LogIn, BookOpen, GraduationCap, ChevronRight } from "lucide-react";

export function GoogleLoginButton({ onSyncComplete, className }: { onSyncComplete: () => void, className?: string }) {
    const { login, isDownloading, isAuthenticated, downloadProgress } = useGoogleDrive();
    const [hasAttemptedAutoRestore, setHasAttemptedAutoRestore] = useState(false);

    // Auto-restore effect:
    useEffect(() => {
        let mounted = true;
        const tryRestore = async () => {
            if (isAuthenticated && !isDownloading) {
                // 1. Check if we already have progress (e.g. from login download)
                if (StorageService.loadProgress()) {
                    onSyncComplete();
                    return;
                }

                // 2. If not, and we haven't tried yet (e.g. page reload), try explicit download
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
            <div className={`flex items-center gap-2 px-4 py-2 text-sm text-green-600 ${className}`}>
                <Loader2 size={16} className="animate-spin" />
                <span>Restoring your progress...</span>
            </div>
        );
    }

    if (isAuthenticated) {
        // If authenticated but we are still here (and auto-restore finished/failed),
        // show a Manual Retry button just in case.
        return (
            <Button
                variant="ghost"
                onClick={async () => {
                    await downloadProgress();
                    onSyncComplete();
                }}
                className={`text-sm font-medium hover:bg-black/5 text-primary ${className}`}
            >
                <Cloud size={16} className="mr-2" />
                Retry Restore
            </Button>
        )
    }

    return (
        <Button
            variant="secondary"
            onClick={() => login()}
            className={`w-full text-sm font-medium ${className}`}
        >
            <LogIn size={16} className="mr-2" />
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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background relative overflow-hidden transition-colors duration-200">
            {/* Subtle floating background elements (optional flair) */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none select-none text-[20vw] font-mincho text-primary/10 overflow-hidden leading-none translate-x-1/4 -translate-y-1/4">
                語感
            </div>

            <main className="w-full max-w-2xl mx-auto space-y-12 animate-fade-in z-10">
                {/* Header & Philosophy */}
                <div className="text-center space-y-6">
                    <h1 className="text-4xl md:text-5xl font-mincho text-primary mx-auto">
                        Welcome to Gokan
                    </h1>
                    <div className="space-y-4 text-secondary leading-relaxed font-serif max-w-xl mx-auto">
                        <p>
                            <strong>Gokan</strong> (語感) means "sense of language". This application is a serious study instrument designed to help you truly acquire Japanese vocabulary, not just memorize flashcards.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-sm text-center">
                            <div className="space-y-2">
                                <div className="mx-auto w-10 h-10 rounded-full bg-surface border border-divider flex items-center justify-center text-primary">
                                    <Cloud size={18} />
                                </div>
                                <h3 className="font-bold text-primary">Daily SRS</h3>
                                <p className="text-tertiary text-xs">A custom Spaced Repetition System optimized for long-term retention.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="mx-auto w-10 h-10 rounded-full bg-surface border border-divider flex items-center justify-center text-primary">
                                    <GraduationCap size={18} />
                                </div>
                                <h3 className="font-bold text-primary">Contextual Meaning</h3>
                                <p className="text-tertiary text-xs">Learn nuance by translating vocabulary within real Japanese sentences.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="mx-auto w-10 h-10 rounded-full bg-surface border border-divider flex items-center justify-center text-primary">
                                    <BookOpen size={18} />
                                </div>
                                <h3 className="font-bold text-primary">Read Native Material</h3>
                                <p className="text-tertiary text-xs">The bridge between textbook kanji and reading actual Japanese media.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Path Selection */}
                <div className="space-y-4 pt-4">
                    <h2 className="text-sm uppercase tracking-widest font-gothic text-tertiary text-center mb-6">
                        Choose your path
                    </h2>

                    <div className="grid gap-4">
                        <button
                            onClick={onSelectBeginner}
                            className="group flex items-center justify-between p-6 bg-surface border border-divider hover:border-accent/40 rounded-xl transition-all shadow-sm hover:shadow-md text-left"
                        >
                            <div className="pr-4">
                                <h3 className="font-bold text-lg text-primary font-gothic flex items-center gap-2 mb-1">
                                    Complete Beginner
                                </h3>
                                <p className="text-sm text-secondary font-serif">
                                    I don't know any Kanji yet. Start me from the very beginning with the Kodansha (KKLC) order.
                                </p>
                            </div>
                            <ChevronRight className="text-tertiary group-hover:text-accent transition-colors flex-shrink-0" />
                        </button>

                        <button
                            onClick={onSelectLearner}
                            className="group flex items-center justify-between p-6 bg-surface border border-divider hover:border-accent/40 rounded-xl transition-all shadow-sm hover:shadow-md text-left"
                        >
                            <div className="pr-4">
                                <h3 className="font-bold text-lg text-primary font-gothic flex items-center gap-2 mb-1">
                                    Kanji Learner
                                </h3>
                                <p className="text-sm text-secondary font-serif">
                                    I already know some Kanji. Let me tailor my vocabulary queue to strictly introduce words using my known Kanji.
                                </p>
                            </div>
                            <ChevronRight className="text-tertiary group-hover:text-accent transition-colors flex-shrink-0" />
                        </button>
                    </div>
                </div>

                {/* Load Existing */}
                <div className="pt-8 border-t border-divider w-full max-w-sm mx-auto">
                    <GoogleLoginButton onSyncComplete={() => window.location.reload()} />
                </div>
            </main>
        </div>
    );
}
