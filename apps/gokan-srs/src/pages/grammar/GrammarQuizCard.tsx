import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { JlptChip } from "../../components/JlptChip";

/**
 * The grammar quiz itself: an English prompt the user translates into
 * Japanese, with the sentence rendered as literal text interspersed with
 * discrete input blanks - one per word the user already knows from the vocab
 * activity (see computeBlankPlan in grammarSelectors.ts for the selection
 * rule). Words the user doesn't know yet stay pre-filled as plain text, so an
 * unfamiliar word never blocks practicing the grammar point itself (issue #17).
 */
export function GrammarQuizCard() {
    const { state, grammarActions, grammarComputed } = useQuiz();
    const { isMobile } = useResponsive();
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    const point = state.currentGrammarPoint;
    const plan = state.currentGrammarBlankPlan;
    const feedback = state.grammarFeedback;

    useEffect(() => {
        if (!feedback?.show) {
            const timer = setTimeout(() => firstInputRef.current?.focus(), 0);
            return () => clearTimeout(timer);
        }
    }, [point?.id, plan, feedback?.show]);

    if (!point || !plan) return null;

    const example = point.examples[plan.exampleIndex];
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
        : feedback?.type === 'minor_error'
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
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <JlptChip level={point.jlptLevel} />
                        <span className="text-xs font-gothic text-secondary">{point.title}</span>
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
                            const borderClass = !feedback?.show
                                ? 'border-divider focus:border-accent'
                                : result === 'wrong'
                                    ? 'border-error'
                                    : result === 'minor_error'
                                        ? 'border-secondary'
                                        : 'border-accent';

                            const expected = word.reading ?? word.surface;

                            return (
                                <span key={i} className="inline-flex flex-col items-center mx-0.5">
                                    <input
                                        ref={answerIndex === 0 ? firstInputRef : undefined}
                                        type="text"
                                        value={state.grammarAnswers[answerIndex] ?? ''}
                                        onChange={(e) => grammarActions.setGrammarAnswer(answerIndex, e.target.value)}
                                        disabled={feedback?.show}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck="false"
                                        style={{ width: `${Math.max(3, expected.length + 1.5)}ch` }}
                                        className={`border-b-2 bg-transparent text-center focus:outline-none transition-colors font-gothic caret-accent ${borderClass}`}
                                    />
                                    {feedback?.show && result !== 'correct' && (
                                        <span className="text-xs text-secondary font-gothic mt-1">
                                            {expected}
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
