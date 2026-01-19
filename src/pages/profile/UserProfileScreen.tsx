import { Button } from "../../components/ui/Button";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useQuiz } from "../../context/useQuiz";
import { VocabList } from "../../components/VocabList";

export function UserProfileScreen({ onBack }: { onBack: () => void }) {
    const { state, actions } = useQuiz();

    return (
        <div className="w-full max-w-2xl md:max-w-3xl flex flex-col gap-2 animate-fade-in">
            <header className="w-full mb-6 flex items-center justify-center relative h-12">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="absolute left-0"
                >
                    ← Back
                </Button>

                <h1 className="text-xl font-serif text-primary">
                    Your learning
                </h1>
            </header>

            <section className="w-full mt-8">
                <h2 className="text-lg mb-4 text-primary font-serif">
                    Kanji
                </h2>

                <KanjiKnowledgeEditor onKanjiKnowledgeChange={actions.updateKanjiKnowledge} />

            </section>

            <section className="w-full mt-16">
                <h2 className="text-lg mb-4 text-primary font-serif">
                    Vocabulary
                </h2>

                <VocabList
                    progress={state.progress!.learningQueue}
                />
            </section>
        </div>
    );
}
