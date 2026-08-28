import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { useQuizFocusManagement } from "../../hooks/useQuizFocusManagement";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { Button } from "../../components/ui/Button";
import { JlptChip } from "../../components/JlptChip";
import { MasteryRing } from "../../components/MasteryRing";

const CLASS_LABELS: Record<string, string> = {
    'godan': 'godan (u-verb)',
    'ichidan': 'ichidan (ru-verb)',
    'irregular': 'irregular',
    'i-adjective': 'い-adjective',
    'na-adjective': 'な-adjective',
};

/**
 * The transformation drill, for `kind: 'inflection'` points - the ones whose
 * identity is a derivation rather than a fixed marker, so the sentence cloze in
 * GrammarQuizCard has nothing invariant to blank.
 *
 * Given a dictionary form and a target form, produce the conjugation. Both kanji
 * and kana are accepted, along with any alternative the dataset marked as
 * equally correct (書かされる for the causative-passive, the colloquial 食べれる
 * for the ichidan potential).
 *
 * Deliberately thin: the plan is a one-blank GrammarBlankPlan, so this card
 * shares `grammarAnswers`, the hint semantics, `gradeGrammarAnswers` and the
 * whole SRS path with the cloze card rather than duplicating any of it.
 */
export function GrammarConjugationCard() {
    const { state, grammarActions, currentGrammarProgress } = useQuiz();
    const { isMobile } = useResponsive();

    const point = state.currentGrammarPoint;
    const plan = state.currentGrammarBlankPlan;
    const feedback = state.grammarFeedback;

    const { firstInputRef, continueRef } = useQuizFocusManagement(
        {
            feedbackShown: !!feedback?.show,
            skipContinueFocus: !!feedback?.show && feedback.correct,
            continueFocusDelay: 50,
        },
        [point?.id, plan, feedback]
    );

    if (!point || !plan?.conjugation) return null;

    const { lemma, lemmaReading, formLabel, wordClass, target } = plan.conjugation;
    const revealed = (state.grammarHintLevels[0] ?? 0) >= 2;
    const answer = state.grammarAnswers[0] ?? '';

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (feedback?.show) return;
        grammarActions.submitGrammarAnswer();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <Card size="lg" className={isMobile ? '!p-4' : ''}>
                <CardSection>
                    <div className="flex justify-end mb-2">
                        <MasteryRing memoryStrength={currentGrammarProgress?.entry.memoryStrength ?? 0} size={40} />
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Link to={`/grammar/${point.id}`} aria-label="View grammar point details">
                            <JlptChip level={point.jlptLevel} />
                        </Link>
                    </div>
                    <p className="text-center text-xs text-tertiary font-gothic">
                        {CLASS_LABELS[wordClass] ?? wordClass}
                    </p>
                </CardSection>

                <CardSection>
                    {/* The dictionary form, then the form being asked for. */}
                    <div className="text-center">
                        <p className="text-3xl font-mincho text-primary leading-snug">{lemma}</p>
                        <p className="text-sm text-tertiary font-gothic mt-1">{lemmaReading}</p>
                    </div>

                    <div className="text-center my-4">
                        <ArrowDown className="inline-block w-5 h-5 text-tertiary" aria-hidden="true" />
                        <p className="uppercase tracking-wide text-label-neutral text-xs font-gothic mt-1">
                            {formLabel}
                        </p>
                    </div>

                    <form onSubmit={onSubmit}>
                        <input
                            ref={firstInputRef}
                            type="text"
                            value={answer}
                            onChange={e => grammarActions.setGrammarAnswer(0, e.target.value)}
                            disabled={!!feedback?.show}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            aria-label={`${formLabel} of ${lemma}`}
                            className="w-full text-center text-2xl font-gothic bg-transparent border-b-2 border-divider focus:border-accent outline-none py-2 text-primary disabled:opacity-70"
                        />
                    </form>

                    {revealed && !feedback?.show && (
                        <p className="text-center text-sm text-secondary font-gothic mt-3">{target}</p>
                    )}
                </CardSection>

                {feedback?.show && (
                    <CardSection>
                        <p className={`text-center font-gothic text-sm ${feedback.correct ? 'text-feedback-correct' : 'text-feedback-incorrect'}`}>
                            {feedback.message}
                        </p>
                        {!feedback.correct && (
                            <p className="text-center text-2xl font-mincho text-primary mt-2">{target}</p>
                        )}
                    </CardSection>
                )}

                <CardSection>
                    {feedback?.show ? (
                        <button
                            ref={continueRef}
                            type="button"
                            onClick={() => grammarActions.continueGrammarToNext()}
                            className="w-full font-medium rounded-lg transition-colors font-serif bg-accent text-surface hover:bg-accent-hover shadow-md flex items-center justify-center gap-2 h-12"
                        >
                            <span>Continue</span>
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => grammarActions.revealGrammarHint(0)}
                                disabled={revealed}
                            >
                                {revealed ? 'Revealed' : 'Reveal'}
                            </Button>
                            <Button variant="primary" type="button" className="flex-1" onClick={onSubmit}>
                                Check
                            </Button>
                        </div>
                    )}
                </CardSection>
            </Card>
        </motion.div>
    );
}
