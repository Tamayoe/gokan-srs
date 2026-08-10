import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { useQuizFocusManagement } from "../../hooks/useQuizFocusManagement";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { Button } from "../../components/ui/Button";
import { JlptChip } from "../../components/JlptChip";
import { MasteryRing } from "../../components/MasteryRing";

/**
 * The grammar quiz itself: an English prompt the user translates into
 * Japanese, with the sentence rendered as literal text interspersed with
 * discrete input blanks - one per word the user already knows from the vocab
 * activity (see computeBlankPlan in grammarSelectors.ts for the selection
 * rule). Words the user doesn't know yet stay pre-filled as plain text, so an
 * unfamiliar word never blocks practicing the grammar point itself (issue #17).
 * A plan with no blankable word at all (plan.readOnly) renders as pure study
 * material instead - see the early return below.
 */
export function GrammarQuizCard() {
    const { state, grammarActions, grammarComputed, currentGrammarProgress } = useQuiz();
    const { isMobile } = useResponsive();

    const point = state.currentGrammarPoint;
    const plan = state.currentGrammarBlankPlan;
    const feedback = state.grammarFeedback;

    const { firstInputRef, continueRef } = useQuizFocusManagement(
        {
            feedbackShown: !!feedback?.show,
            // A fully-correct answer auto-advances (owned by useGrammarOrchestration) - nothing to focus there.
            skipContinueFocus: !!feedback?.show && feedback.correct,
            continueFocusDelay: 50,
        },
        [point?.id, plan, feedback]
    );

    if (!point || !plan) return null;

    const example = point.examples[plan.exampleIndex];

    if (plan.readOnly) {
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
                        <div className="mb-4">
                            <div className="flex items-center justify-center gap-2">
                                <Link to={`/grammar/${point.id}`} aria-label="View grammar point details">
                                    <JlptChip level={point.jlptLevel} />
                                </Link>
                            </div>
                            {point.usageNote && (
                                <p className="text-center text-xs text-secondary font-gothic italic mt-1 max-w-sm mx-auto">
                                    {point.usageNote}
                                </p>
                            )}
                        </div>

                        <p className="text-center text-sm text-secondary font-gothic mb-1">
                            No quizzable words in this example - study it instead
                        </p>
                        <p className="text-center text-lg text-primary font-serif mb-6">
                            {example.en}
                        </p>
                        <p className="text-center text-2xl font-gothic leading-loose text-primary">
                            {example.jp}
                        </p>
                    </CardSection>

                    <CardSection>
                        <Button
                            variant="primary"
                            type="button"
                            className="w-full"
                            onClick={() => grammarActions.continueGrammarToNext()}
                        >
                            Continue
                        </Button>
                    </CardSection>
                </Card>
            </motion.div>
        );
    }

    const answerIndexByWordIndex = new Map<number, number>();
    plan.blankWordIndices.forEach((wordIndex, answerIndex) => answerIndexByWordIndex.set(wordIndex, answerIndex));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!feedback?.show) {
            grammarActions.submitGrammarAnswer();
        } else if (grammarComputed.canContinueGrammar) {
            grammarActions.continueGrammarToNext();
        }
    };

    const feedbackBorderClass = feedback?.type === 'wrong'
        ? 'border-l-error-accent'
        : feedback?.type === 'minor_error' || feedback?.type === 'pass'
            ? 'border-l-secondary'
            : 'border-l-accent';

    return (
        <motion.form
            onSubmit={handleSubmit}
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
                    <div className="mb-4">
                        <div className="flex items-center justify-center gap-2">
                            <Link to={`/grammar/${point.id}`} aria-label="View grammar point details">
                                <JlptChip level={point.jlptLevel} />
                            </Link>
                        </div>
                        {point.usageNote && (
                            <p className="text-center text-xs text-secondary font-gothic italic mt-1 max-w-sm mx-auto">
                                {point.usageNote}
                            </p>
                        )}
                    </div>

                    <p className="text-center text-sm text-secondary font-gothic mb-1">
                        Translate into Japanese
                    </p>
                    <p className="text-center text-lg text-primary font-serif mb-8">
                        {example.en}
                    </p>

                    <div className="flex flex-wrap items-end justify-center gap-y-3 text-2xl font-gothic leading-loose text-primary">
                        {example.words.map((word, i) => {
                            const answerIndex = answerIndexByWordIndex.get(i);

                            if (answerIndex === undefined) {
                                return <span key={i}>{word.surface}</span>;
                            }

                            const result = feedback?.perBlankResults[answerIndex];
                            const hintLevel = state.grammarHintLevels[answerIndex] ?? 0;
                            const revealed = hintLevel >= 2;
                            const revealedAnswer = plan.acceptLists[answerIndex]?.[0] ?? '';
                            const liveValue = state.grammarAnswers[answerIndex] ?? '';
                            const displayValue = revealed ? revealedAnswer : liveValue;

                            const borderClass = !feedback?.show
                                ? revealed
                                    ? 'border-secondary'
                                    : 'border-divider focus:border-accent'
                                : result === 'wrong'
                                    ? 'border-error'
                                    : result === 'minor_error' || result === 'pass'
                                        ? 'border-secondary'
                                        : 'border-accent';

                            return (
                                <span key={i} className="inline-flex flex-col items-center mx-0.5">
                                    <span className="inline-flex items-center gap-1">
                                        <input
                                            ref={answerIndex === 0 ? firstInputRef : undefined}
                                            type="text"
                                            value={displayValue}
                                            onChange={(e) => grammarActions.setGrammarAnswer(answerIndex, e.target.value)}
                                            disabled={feedback?.show || revealed}
                                            autoComplete="off"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                            style={{ width: `${Math.max(4, displayValue.length + 1)}ch` }}
                                            className={`border-b-2 bg-transparent text-center focus:outline-none transition-colors font-gothic caret-accent ${borderClass}`}
                                        />
                                        {!feedback?.show && !revealed && (
                                            <button
                                                type="button"
                                                onClick={() => grammarActions.revealGrammarHint(answerIndex)}
                                                className="text-xs text-secondary hover:text-primary transition-colors font-gothic w-4 h-4 rounded-full border border-divider flex items-center justify-center shrink-0"
                                                aria-label="Show hint"
                                            >
                                                ?
                                            </button>
                                        )}
                                    </span>
                                    {!feedback?.show && hintLevel === 1 && (
                                        <span className="text-xs text-secondary font-gothic mt-1">
                                            {plan.glosses[answerIndex] || 'No hint available'}
                                        </span>
                                    )}
                                    {feedback?.show && result !== 'correct' && (
                                        <span className="text-xs text-secondary font-gothic mt-1">
                                            {feedback.matchedAnswers[answerIndex]}
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                </CardSection>

                <CardSection>
                    {feedback?.show && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`border rounded bg-feedback-background border-divider border-l-4 p-4 mb-4 ${feedbackBorderClass}`}
                        >
                            <p className="text-sm font-gothic text-primary">{feedback.message}</p>
                        </motion.div>
                    )}

                    {!feedback?.show ? (
                        <button
                            type="submit"
                            disabled={!grammarComputed.canSubmitGrammar}
                            className={`w-full font-medium rounded-lg transition-all duration-200 font-serif flex items-center justify-center gap-2 h-12
                                ${grammarComputed.canSubmitGrammar
                                    ? 'bg-accent text-surface hover:bg-accent-hover shadow-md hover:shadow-lg'
                                    : 'bg-accent/50 text-surface/80 cursor-not-allowed'}`}
                        >
                            <span>Submit</span>
                        </button>
                    ) : (
                        <button
                            ref={continueRef}
                            type="submit"
                            className="w-full font-medium rounded-lg transition-colors font-serif bg-accent text-surface hover:bg-accent-hover shadow-md flex items-center justify-center gap-2 h-12"
                        >
                            <span>Continue</span>
                        </button>
                    )}
                </CardSection>
            </Card>
        </motion.form>
    );
}
