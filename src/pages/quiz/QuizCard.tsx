import React, { useEffect, useRef, useState } from 'react';
import { useQuiz } from "../../context/useQuiz";
import { CONSTANTS } from "../../commons/constants";

import { MasteryRing } from "../../components/MasteryRing";
import { Card } from "../../components/ui/Card";
import { CardSection } from "../../components/ui/CardSection";
import { TagsLookup } from "../../models/data.model";
import type { Tags } from "../../models/data.model";


export const QuizCard: React.FC = () => {
    const { state, currentProgress, actions, computed } = useQuiz();
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const continueRef = useRef<HTMLButtonElement | null>(null);

    // Get data from centralized state
    const { currentVocab, userAnswer, feedback, progress } = state;

    if (!currentVocab || !progress) return null;

    // Clear and focus input when vocabulary changes
    useEffect(() => {
        setShowCorrectAnswer(false);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [currentVocab.id]);

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
        <form onSubmit={handleSubmit}>
            <Card size="lg">
                {/* Kanji */}
                <CardSection>
                    {/* Top-right mastery */}
                    <div className="flex justify-end mb-4">
                        <MasteryRing mastery={currentProgress?.mastery ?? 0} />
                    </div>

                    {/* Kanji Display */}
                    <div className="text-center mb-8">
                        <div className="leading-none mb-4 text-primary text-kanji font-mincho">
                            {currentVocab.writtenForm.kanji}
                        </div>

                        {/* Disambiguation helpers */}
                        <div className="flex flex-col items-center gap-3 py-1">
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

                    {/* Glosses — feedback only, all senses */}
                    {feedback?.show && (
                        <div className="text-center text-sm space-y-1 text-meaning-muted font-serif">
                            {currentVocab.senses.map((sense, index) => (
                                <p key={index}>
                                    {sense.glosses.join(', ')}
                                </p>
                            ))}
                        </div>
                    )}
                </CardSection>
                <CardSection>

                    {/* Input Section */}
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="answer"
                                className="block text-sm mb-2 text-secondary font-gothic"
                            >
                                Reading (hiragana)
                            </label>
                            <input
                                ref={inputRef}
                                id="answer"
                                type="text"
                                value={userAnswer}
                                onChange={(e) => actions.setAnswer(e.target.value)}
                                className="w-full px-4 py-3 border rounded text-2xl text-center focus:outline-none transition-colors border-divider text-primary bg-surface font-gothic focus:border-accent placeholder:text-input-placeholder"
                                placeholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
                                autoFocus
                                disabled={feedback?.show}
                            />
                        </div>

                        {/* Incorrect Answer Feedback */}
                        {feedback?.show && !feedback.correct && (
                            <div className="border rounded bg-feedback-background border-divider border-l-4 border-l-error-accent p-4">
                                <p className="uppercase tracking-wide text-label-neutral text-xs mb-2 font-gothic">
                                    Correct answer
                                </p>

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
                                            {[currentVocab.reading.primary, ...currentVocab.reading.alternatives].join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Correct Answer Feedback */}
                        {feedback?.show && feedback.correct && (
                            <div className="border rounded bg-surface border-accent p-4">
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
                            </div>
                        )}

                        {/* Action Button */}
                        {!feedback?.show ? (
                            <button
                                type="submit"
                                disabled={!computed.canSubmit}
                                className={`w-full font-medium rounded transition-colors h-12 mt-6 font-serif ${computed.canSubmit ? 'bg-accent text-surface hover:bg-accent-hover cursor-pointer' : 'bg-divider text-surface cursor-not-allowed'}`}
                            >
                                Submit
                            </button>
                        ) : (
                            !feedback.correct && (
                                <button
                                    ref={continueRef}
                                    type="submit"
                                    className="w-full font-medium rounded transition-colors h-12 mt-6 font-serif bg-accent text-surface hover:bg-accent-hover"
                                >
                                    Continue
                                </button>
                            )
                        )}
                    </div>
                </CardSection>
            </Card>
        </form>
    );
};
