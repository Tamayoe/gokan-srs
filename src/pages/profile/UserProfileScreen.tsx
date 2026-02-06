import { Button } from "../../components/ui/Button";
import { KanjiKnowledgeEditor } from "../../components/KanjiKnowledgeEditor";
import { useQuiz } from "../../context/useQuiz";

import { useNavigate } from "react-router-dom"; // Add import

export function UserProfileScreen({ onBack, onVocabClick }: { onBack: () => void; onVocabClick?: (vocabId: string) => void }) {
    const { state, actions } = useQuiz();
    const navigate = useNavigate(); // Hook

    return (
        <div className="w-full max-w-2xl md:max-w-3xl flex flex-col gap-2 animate-fade-in">
            {/* ... header ... */}
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
                    Vocabulary & Statistics
                </h2>

                <div className="p-6 bg-white rounded-lg border border-gray-100 shadow-sm text-center flex flex-col items-center gap-4">
                    <p className="text-gray-600">
                        View your full vocabulary list, global win-rate, and review forecast in the new Statistics page.
                    </p>
                    <Button onClick={() => navigate('/stats')}>
                        Go to Statistics Page
                    </Button>
                </div>
            </section>
        </div>
    );
}
