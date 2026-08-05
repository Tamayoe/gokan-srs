import { Link } from "react-router-dom";
import { useQuiz } from "../../context/useQuiz";
import { CenteredCard } from "../../components/CenteredCard";
import { GrammarIntroCard } from "./GrammarIntroCard";
import { GrammarQuizCard } from "./GrammarQuizCard";

/**
 * Route /grammar - the Grammar activity, alongside the vocab quiz on /quiz.
 * Mirrors QuizScreen's exhaustive switch over session state, minus the
 * 'learn-kanji' case: grammar has no kanji-gated learning step (see
 * GrammarSessionState in grammarSelectors.ts).
 */
export function GrammarScreen() {
    const { state, grammarSessionState, grammarNextReviewAt, shouldShowGrammarIntro, grammarActions } = useQuiz();

    switch (grammarSessionState) {
        case "waiting": {
            const minutes = Math.max(1, Math.ceil((grammarNextReviewAt!.getTime() - Date.now()) / 60000));
            return (
                <CenteredCard>
                    <h2 className="text-xl mb-4 text-primary font-serif">You're done for now</h2>
                    <p className="text-sm mb-6 text-secondary font-serif">
                        Your next grammar review will be available in{' '}
                        <strong>{minutes} minute{minutes > 1 ? 's' : ''}</strong>.
                    </p>
                    <Link to="/" className="text-xs text-secondary hover:text-primary transition-colors">
                        Back to activities
                    </Link>
                </CenteredCard>
            );
        }

        case "exhausted":
            return (
                <CenteredCard>
                    <h2 className="text-xl mb-4 text-primary font-serif">All caught up</h2>
                    <p className="text-sm text-secondary font-serif mb-6">Come back tomorrow.</p>
                    <Link to="/" className="text-xs text-secondary hover:text-primary transition-colors">
                        Back to activities
                    </Link>
                </CenteredCard>
            );

        case "review":
        case "learn": {
            if (state.isLoadingGrammar || !state.currentGrammarPoint) {
                return (
                    <div className="flex items-center justify-center">
                        <div className="text-secondary">Loading grammar...</div>
                    </div>
                );
            }

            if (shouldShowGrammarIntro) {
                return (
                    <GrammarIntroCard
                        grammarPoint={state.currentGrammarPoint}
                        onLearn={() => grammarActions.saveGrammarIntroChoice(state.currentGrammarPoint!, 'learn')}
                        onSkip={() => grammarActions.saveGrammarIntroChoice(state.currentGrammarPoint!, 'skip')}
                    />
                );
            }

            return (
                <div className="flex flex-col flex-1 items-center justify-center py-6 w-full">
                    <GrammarQuizCard />
                </div>
            );
        }

        default: {
            // Compile-time exhaustiveness check, mirroring QuizScreen.
            const _exhaustive: never = grammarSessionState;
            return _exhaustive;
        }
    }
}
