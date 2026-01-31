import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { CONSTANTS } from "../../commons/constants";

import { MasteryRing } from "../../components/MasteryRing";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { TagsLookup } from "../../models/data.model";
import type { Tags } from "../../models/data.model";


interface QuizCardProps {
    onKanjiClick?: () => void;
}

export function QuizCard({ onKanjiClick }: QuizCardProps) {
    const { state, currentProgress, actions, computed } = useQuiz();
    const { isMobile } = useResponsive();
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const continueRef = useRef<HTMLButtonElement | null>(null);

    // Get data from centralized state
    const { currentVocab, userAnswer, feedback, progress } = state;

    // Compact mode: reduce spacing when keyboard is active on mobile
    const isCompact = isMobile && isInputFocused && !feedback?.show;

    if (!currentVocab || !progress) return null;

    // Clear and focus input when vocabulary changes
    useEffect(() => {
        setShowCorrectAnswer(false);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [currentVocab.id]);

    // Refocus input when feedback is cleared (for retry case with same vocab)
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

    return (
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <Card size="lg" className={isMobile ? '!p-4' : ''}>
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
                {/* Kanji */}
                <CardSection className={isCompact ? '!mb-3' : ''}>
                    {isMobile ? (
                        // Horizontal layout for all mobile views
                        <div className={`${isCompact ? 'mb-1' : 'mb-4'}`}>
                            {/* Kanji and info */}
                            <div className="flex-1">
                                <div
                                    className={`text-5xl leading-none text-primary font-mincho mb-2 ${onKanjiClick && feedback?.show ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                    onClick={() => feedback?.show && onKanjiClick?.()}
                                >
                                    {currentVocab.writtenForm.kanji}
                                </div>
                                {/* POS tags */}
                                {currentVocab.senses.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(
                                            new Set(
                                                currentVocab.senses.flatMap(sense => [
                                                    ...sense.pos,
                                                    ...(sense.misc?.rawTags ?? []),
                                                ])
                                            )
                                        ).slice(0, isCompact ? 2 : 3).map(rawTag => (
                                            <span
                                                key={rawTag}
                                                className="px-1.5 py-0.5 text-[9px] rounded bg-feedback-background text-secondary font-gothic whitespace-nowrap"
                                            >
                                                {TagsLookup[rawTag as Tags]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Desktop vertical layout
                        <>
                            {/* Top-right mastery */}
                            <div className="flex justify-end mb-4">
                                <div className="flex flex-col items-center gap-1">
                                    <MasteryRing memoryStrength={currentProgress?.reading.memoryStrength ?? 0} size={50} />
                                    <span className="text-[10px] text-tertiary uppercase tracking-widest font-gothic font-semibold">
                                        Mastery
                                    </span>
                                </div>
                            </div>

                            {/* Kanji Display */}
                            <div className="text-center mb-8">
                                <div
                                    className={`leading-none text-primary text-kanji font-mincho mb-4 ${onKanjiClick && feedback?.show ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                    onClick={() => feedback?.show && onKanjiClick?.()}
                                >
                                    {currentVocab.writtenForm.kanji}
                                </div>

                                {/* Disambiguation helpers */}
                                <div className="flex flex-col items-center py-1 gap-3">
                                    {/* POS + misc tags */}
                                    {currentVocab.senses.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {Array.from(
                                                new Set(
                                                    currentVocab.senses.flatMap(sense => [
                                                        ...sense.pos,
                                                        ...(sense.misc?.rawTags ?? []),
                                                    ])
                                                )
                                            ).map(rawTag => (
                                                <span
                                                    key={rawTag}
                                                    className="px-2 py-0.5 text-xs rounded bg-feedback-background text-secondary font-gothic"
                                                >
                                                    {TagsLookup[rawTag as Tags]}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Related compounds */}
                                    {Array.from(
                                        new Set(
                                            currentVocab.senses.flatMap(
                                                sense => sense.related?.compounds ?? []
                                            )
                                        )
                                    ).length > 0 && (
                                            <div className="text-sm text-meaning-muted font-serif">
                                                {Array.from(
                                                    new Set(
                                                        currentVocab.senses.flatMap(
                                                            sense => sense.related?.compounds ?? []
                                                        )
                                                    )
                                                ).slice(0, 4).join(' ・ ')}
                                            </div>
                                        )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Glosses — feedback only, all senses */}
                    {feedback?.show && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-sm space-y-1 text-meaning-muted font-serif"
                        >
                            {isMobile ? (
                                currentVocab.senses.slice(0, 3).map((sense, index) => (
                                    <p key={index}>
                                        {sense.glosses.join(', ')}
                                    </p>
                                ))
                            ) : (
                                currentVocab.senses.map((sense, index) => (
                                    <p key={index}>
                                        {sense.glosses.join(', ')}
                                    </p>
                                ))
                            )}
                        </motion.div>
                    )}
                </CardSection>
                <CardSection className={isCompact ? '!mb-0' : ''}>

                    {/* Input Section */}
                    <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                        <div className="relative">
                            <label
                                htmlFor="answer"
                                className={`block mb-2 text-secondary font-gothic font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}
                            >
                                Reading (hiragana)
                            </label>
                            <input
                                ref={inputRef}
                                id="answer"
                                type="text"
                                value={userAnswer}
                                onChange={(e) => actions.setAnswer(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                className={`w-full border rounded-lg text-center transition-all duration-200 
                                    font-gothic bg-surface text-primary placeholder:text-input-placeholder caret-accent
                                    focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10
                                    ${isMobile ? 'px-3 py-2 text-lg placeholder:text-sm' : 'px-4 py-3 text-2xl'}
                                    ${feedback?.show && !feedback.correct ? 'border-error' : 'border-divider'}
                                `}
                                placeholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
                                autoFocus
                                disabled={feedback?.show}
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
                                        <p className="text-center text-2xl mb-1 text-primary font-gothic">
                                            {/* Show matched answer if available (for minor error context), or all correct answers */}
                                            {feedback.type === 'minor_error'
                                                ? feedback.matchedAnswer
                                                : [currentVocab.reading.primary, ...currentVocab.reading.alternatives].join(', ')}
                                        </p>
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
                                    className={`w-full font-medium rounded-lg transition-all duration-200 font-serif flex items-center justify-center gap-2
                                        ${isMobile ? 'h-10 mt-4' : 'h-12 mt-6'}
                                        ${computed.canSubmit
                                            ? 'bg-accent text-surface hover:bg-accent-hover shadow-md hover:shadow-lg translate-y-0 active:translate-y-[1px]'
                                            : 'bg-accent/50 text-surface/80 cursor-not-allowed'}`}
                                >
                                    <span>Submit</span>
                                    {computed.canSubmit && <span className="text-xs opacity-70">⏎</span>}
                                </button>
                                {!computed.canSubmit && !isMobile && (
                                    <p className="text-center text-xs text-tertiary mt-2 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Type reading to continue
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
};
