import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { CONSTANTS } from "../../commons/constants";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";

interface BaseQuizCardProps {
    children: React.ReactNode;
    inputLabel: string;
    inputPlaceholder: string;
    renderCorrectAnswer?: () => React.ReactNode;
    onInputFocus?: () => void;
    onInputBlur?: () => void;
}

export function BaseQuizCard({
    children,
    inputLabel,
    inputPlaceholder,
    renderCorrectAnswer,
    onInputFocus,
    onInputBlur
}: BaseQuizCardProps) {
    const { state, actions, computed } = useQuiz();
    const { isMobile } = useResponsive();

    // Local state for UI effects
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Refs
    const inputRef = useRef<HTMLInputElement | null>(null);
    const continueRef = useRef<HTMLButtonElement | null>(null);

    // Get data from centralized state
    const { currentVocab, userAnswer, feedback } = state;

    // Compact mode: reduce spacing when keyboard is active on mobile
    const isCompact = isMobile && isInputFocused && !feedback?.show;

    // Clear and focus input when vocabulary changes
    useEffect(() => {
        setShowCorrectAnswer(false);
        // Small timeout to ensure DOM is ready and prevent fighting with other focus events
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [currentVocab?.id]);

    // Refocus input when feedback is cleared (e.g. strict mode retry)
    useEffect(() => {
        if (!feedback?.show) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [feedback?.show]);

    // Handle incorrect answer reveal animation
    useEffect(() => {
        if (feedback?.show && !feedback.correct) {
            setShowCorrectAnswer(false);
            const timer = setTimeout(() => {
                setShowCorrectAnswer(true);
                continueRef.current?.focus();
            }, CONSTANTS.quiz.incorrectAnswerRevealDelay);
            return () => clearTimeout(timer);
        } else if (!feedback?.show) {
            setShowCorrectAnswer(false);
        }
    }, [feedback]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!feedback?.show) {
            actions.submitAnswer();
        } else if (computed.canContinue) {
            actions.continueToNext().then();
        }
    };

    const handleInputFocus = () => {
        setIsInputFocused(true);
        onInputFocus?.();
    };

    const handleInputBlur = () => {
        setIsInputFocused(false);
        onInputBlur?.();
    };

    if (!currentVocab) return null;

    return (
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <Card size="lg" className={isMobile ? '!p-4' : ''}>
                {/* Shake Animation for Wrong Answer */}
                <AnimatePresence>
                    {feedback?.show && !feedback.correct && (
                        <motion.div
                            initial={{ x: 0 }}
                            animate={{ x: [-5, 5, -5, 5, 0] }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0 pointer-events-none border-4 border-error/20 rounded-xl z-50"
                        />
                    )}
                </AnimatePresence>

                {/* Top Section: Content (Sentences, Kanji, etc.) */}
                <CardSection className={isCompact ? '!mb-3' : ''}>
                    {children}
                </CardSection>

                {/* Bottom Section: Input & Feedback */}
                <CardSection className={isCompact ? '!mb-0' : ''}>
                    <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                        {/* Input Field */}
                        <div className="relative">
                            <label
                                htmlFor="answer"
                                className={`block mb-2 text-secondary font-gothic font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}
                            >
                                {inputLabel}
                            </label>
                            <input
                                ref={inputRef}
                                id="answer"
                                type="text"
                                value={userAnswer}
                                onChange={(e) => actions.setAnswer(e.target.value)}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                className={`w-full border rounded-lg text-center transition-all duration-200 
                                    font-gothic bg-surface text-primary placeholder:text-input-placeholder caret-accent
                                    focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10
                                    ${isMobile ? 'px-3 py-2 text-lg placeholder:text-sm' : 'px-4 py-3 text-xl'}
                                    ${feedback?.show && !feedback.correct ? 'border-error' : 'border-divider'}
                                `}
                                placeholder={inputPlaceholder}
                                autoFocus
                                disabled={feedback?.show}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                        </div>

                        {/* Incorrect / Minor Answer Feedback */}
                        {feedback?.show && !feedback.correct && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`border rounded bg-feedback-background border-divider border-l-4 p-4 ${feedback.type === 'minor_error' ? 'border-l-secondary' : 'border-l-error-accent'}`}
                            >
                                <p className="uppercase tracking-wide text-label-neutral text-xs mb-2 font-gothic">
                                    Correct answer
                                </p>

                                {feedback.type === 'minor_error' && (
                                    <p className="text-secondary text-sm mb-2 font-gothic">
                                        {feedback.message}
                                    </p>
                                )}

                                {showCorrectAnswer && (
                                    <div
                                        className="transition-all duration-200 ease-in-out"
                                        style={{
                                            opacity: showCorrectAnswer ? 1 : 0,
                                            transform: showCorrectAnswer
                                                ? 'translateY(0)'
                                                : 'translateY(-2px)',
                                        }}
                                    >
                                        <div className="text-center text-xl mb-1 text-primary font-gothic">
                                            {renderCorrectAnswer ? renderCorrectAnswer() : feedback.matchedAnswer}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Correct Answer Feedback */}
                        {feedback?.show && feedback.correct && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="border rounded bg-surface border-accent p-4"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle
                                            cx="10"
                                            cy="10"
                                            r="9"
                                            className="stroke-accent"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M6 10L9 13L14 7"
                                            className="stroke-accent"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <p className="text-center text-sm font-medium text-accent font-gothic">
                                        {feedback.message}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Action Button */}
                        {!feedback?.show ? (
                            <div className="group">
                                <button
                                    type="submit"
                                    disabled={!computed.canSubmit}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={`w-full font-medium rounded-lg transition-all duration-200 font-serif flex items-center justify-center gap-2
                                        ${isMobile ? 'h-10 mt-4' : 'h-12 mt-6'}
                                        ${computed.canSubmit
                                            ? 'bg-accent text-surface hover:bg-accent-hover shadow-md hover:shadow-lg translate-y-0 active:translate-y-[1px]'
                                            : 'bg-accent/50 text-surface/80 cursor-not-allowed'}`}
                                >
                                    <span>Submit</span>
                                    {computed.canSubmit && <span className="text-xs opacity-70">⏎</span>}
                                </button>
                                {/* Only show hint on non-mobile when not ready */}
                                {!computed.canSubmit && !isMobile && (
                                    <p className="text-center text-xs text-tertiary mt-2 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Press Enter
                                    </p>
                                )}
                            </div>
                        ) : (
                            !feedback.correct && (
                                <button
                                    ref={continueRef}
                                    type="submit"
                                    className={`w-full font-medium rounded-lg transition-colors font-serif bg-accent text-surface hover:bg-accent-hover shadow-md flex items-center justify-center gap-2
                                        ${isMobile ? 'h-10 mt-4' : 'h-12 mt-6'}`}
                                >
                                    <span>Continue</span>
                                    <span className="text-xs opacity-70">⏎</span>
                                </button>
                            )
                        )}
                    </div>
                </CardSection>
            </Card>
        </motion.form>
    );
}
