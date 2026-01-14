import {KanjiKnowledgeEditor} from "../../components/KanjiKnowledgeEditor";
import {THEME} from "../../commons/theme";
import {useQuiz} from "../../context/useQuiz";
import {VocabList} from "../../components/VocabList";

export function UserProfileScreen({ onBack }: { onBack: () => void }) {
    const { state, actions } = useQuiz();

    return (
        <div className="w-full max-w-5xl flex flex-col gap-2">
            <header className="mb-6 flex justify-between items-center">
                <h1
                    className="text-xl"
                    style={{
                        color: THEME.colors.primary,
                        fontFamily: THEME.fonts.serif,
                    }}
                >
                    Your learning
                </h1>

                <button onClick={onBack}>Back</button>
            </header>

            <section className="mt-8">
                <h2
                    className="text-lg mb-4"
                    style={{ color: THEME.colors.primary }}
                >
                    Kanji
                </h2>

                <KanjiKnowledgeEditor onKanjiKnowledgeChange={actions.updateKanjiKnowledge}/>

            </section>

            <section className="mt-16">
                <h2
                    className="text-lg mb-4"
                    style={{ color: THEME.colors.primary }}
                >
                    Vocabulary
                </h2>

                <VocabList
                    progress={state.progress!.learningQueue}
                />
            </section>
        </div>
    );
}
