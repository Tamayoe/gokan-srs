import { useState, useEffect } from "react";
import { CONSTANTS } from "../../commons/constants";
import type { LearningOrder } from "../../models/user.model";
import { OptionGrid } from "../../components/OptionGrid";
import { SetupHeader } from "../../components/SetupHeader";
import type { SetupValues } from "../../models/state.model";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useKanjiForm } from "../../context/KanjiForm/useKanjiForm";
import { useGoogleDrive } from "../../context/GoogleDriveContext";
import { Button } from "../../components/ui/Button";
import { StorageService } from "../../services/storage.service";
import { Cloud, Loader2, LogIn } from "lucide-react";

function GoogleLoginButton({ onSyncComplete }: { onSyncComplete: () => void }) {
    const { login, isSyncing, isAuthenticated, sync } = useGoogleDrive();
    const [hasAttemptedAutoRestore, setHasAttemptedAutoRestore] = useState(false);

    // Auto-restore effect:
    useEffect(() => {
        let mounted = true;
        const tryRestore = async () => {
            if (isAuthenticated && !isSyncing) {
                // 1. Check if we already have progress (e.g. from login auto-sync)
                if (StorageService.loadProgress()) {
                    onSyncComplete();
                    return;
                }

                // 2. If not, and we haven't tried yet (e.g. page reload), try explicit sync
                if (!hasAttemptedAutoRestore) {
                    setHasAttemptedAutoRestore(true);
                    const success = await sync();
                    if (success && mounted) {
                        onSyncComplete();
                    }
                }
            }
        };
        tryRestore();
        return () => { mounted = false; };
    }, [isAuthenticated, isSyncing, hasAttemptedAutoRestore, sync, onSyncComplete]);

    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-green-600">
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
                    const success = await sync();
                    if (success) {
                        onSyncComplete();
                    } else {
                        alert("We couldn't find any backup to restore.");
                    }
                }}
                className="text-sm font-medium hover:bg-black/5 text-primary"
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
            className="text-sm font-medium"
        >
            <LogIn size={16} className="mr-2" />
            Already have an account? Log in to restore
        </Button>
    );
}

export function SetupScreen({ onComplete }: { onComplete: (values: SetupValues) => Promise<void> }) {
    const { state } = useKanjiForm();
    const { isSyncing } = useGoogleDrive();

    const [learningOrder, setLearningOrder] = useState<LearningOrder>('frequency');

    const handleSubmit = () => {
        if (
            state.kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            state.kanjiCount <= CONSTANTS.setup.maximumKanjiCount
        ) {
            const values: SetupValues = {
                kanjiKnowledge: {
                    method: state.kanjiMethod,
                    step: state.kanjiCount,
                    kanjiSet: new Set(state.knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                }
            }
            onComplete(values).then();
        }
    };

    if (state.loading) {
        return (<p>Loading...</p>)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background transition-colors duration-200">
            <div className="max-w-3xl mx-auto p-8 space-y-12">
                <SetupHeader />

                <KanjiKnowledgeEditor />

                <OptionGrid<LearningOrder>
                    title="Vocabulary order"
                    value={learningOrder}
                    onChange={setLearningOrder}
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

                <footer className="pt-4 space-y-4">
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!state.knownKanji || isSyncing}
                        className="w-full py-4 text-lg font-serif h-14"
                    >
                        Start learning
                    </Button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-secondary"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-2 bg-background text-secondary">
                                OR
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLoginButton onSyncComplete={() => window.location.reload()} />
                    </div>
                </footer>
            </div>
        </div>
    );
}
