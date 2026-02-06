import { Button } from "../../components/ui/Button";
import { useQuiz } from "../../context/useQuiz";
import { StatsOverview } from "./components/StatsOverview";
import { ReviewForecast } from "./components/ReviewForecast";
import { SmartVocabList } from "./components/SmartVocabList";

export function StatsScreen({ onBack, onVocabClick }: { onBack: () => void; onVocabClick?: (vocabId: string) => void }) {
    const { state } = useQuiz();

    // Guard if accessible without progress (though route is protected usually)
    if (!state.progress) return null;

    return (
        <div className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in pb-12">
            <header className="w-full flex items-center justify-center relative h-12">
                <Button variant="ghost" onClick={onBack} className="absolute left-0">
                    ← Back
                </Button>
                <h1 className="text-xl font-serif text-primary">Statistics</h1>
            </header>

            <StatsOverview progress={state.progress} />

            <section className="w-full p-6 bg-surface rounded-lg shadow-sm border border-divider">
                <h2 className="text-lg mb-4 text-primary font-serif">Review Forecast</h2>
                <ReviewForecast progress={state.progress} />
            </section>


            <section className="w-full">
                <h2 className="text-lg mb-4 text-primary font-serif">Vocabulary</h2>
                <SmartVocabList
                    progress={state.progress.learningQueue}
                    onVocabClick={onVocabClick}
                />
            </section>
        </div>
    );
}
