import React, {useEffect, useRef, useState} from 'react';
import {useQuiz} from "../../context/useQuiz";
import {CONSTANTS} from "../../commons/constants";
import {THEME} from "../../commons/theme";
import {MasteryRing} from "../../components/MasteryRing";
import {Card} from "../../components/ui/Card";
import {CardSection} from "../../components/ui/CardSection";
import {TagsLookup} from "../../models/data.model";
import type {Tags} from "../../models/data.model";


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
                        <div
                            className="leading-none mb-4"
                            style={{
                                color: THEME.colors.primary,
                                fontSize: THEME.fontSizes.kanji,
                                fontFamily: THEME.fonts.mincho,
                            }}
                        >
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
                                            className="px-2 py-0.5 text-xs rounded"
                                            style={{
                                                backgroundColor: THEME.colors.feedbackBackground,
                                                color: THEME.colors.secondary,
                                                fontFamily: THEME.fonts.gothic,
                                            }}
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
                                <div
                                    className="text-sm"
                                    style={{
                                        color: THEME.colors.meaningMuted,
                                        fontFamily: THEME.fonts.serif,
                                    }}
                                >
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
                        <div
                            className="text-center text-sm space-y-1"
                            style={{
                                color: THEME.colors.meaningMuted,
                                fontFamily: THEME.fonts.serif,
                            }}
                        >
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
                                className="block text-sm mb-2"
                                style={{
                                    color: THEME.colors.secondary,
                                    fontFamily: THEME.fonts.gothic,
                                }}
                            >
                                Reading (hiragana)
                            </label>
                            <input
                                ref={inputRef}
                                id="answer"
                                type="text"
                                value={userAnswer}
                                onChange={(e) => actions.setAnswer(e.target.value)}
                                className="w-full px-4 py-3 border rounded text-2xl text-center focus:outline-none transition-colors"
                                style={{
                                    borderColor: THEME.colors.divider,
                                    color: THEME.colors.primary,
                                    backgroundColor: THEME.colors.surface,
                                    fontFamily: THEME.fonts.gothic,
                                }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = THEME.colors.accent)
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = THEME.colors.divider)
                                }
                                placeholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
                                autoFocus
                                disabled={feedback?.show}
                            />
                            <style>{`
                  #answer::placeholder {
                    color: ${THEME.colors.inputPlaceholder};
                  }
                `}</style>
                        </div>

                        {/* Incorrect Answer Feedback */}
                        {feedback?.show && !feedback.correct && (
                            <div
                                className="border rounded"
                                style={{
                                    backgroundColor: THEME.colors.feedbackBackground,
                                    borderColor: THEME.colors.divider,
                                    borderLeft: `${THEME.spacing.errorBorderWidth}px solid ${THEME.colors.errorAccent}`,
                                    borderRadius: `${THEME.sizes.borderRadius}px`,
                                    padding: `${THEME.spacing.feedbackPadding}px`,
                                }}
                            >
                                <p
                                    className="uppercase tracking-wide"
                                    style={{
                                        color: THEME.colors.labelNeutral,
                                        fontSize: THEME.fontSizes.labelSmall,
                                        marginBottom: `${THEME.spacing.labelMargin}px`,
                                        fontFamily: THEME.fonts.gothic,
                                    }}
                                >
                                    Correct answer
                                </p>

                                {showCorrectAnswer && (
                                    <div
                                        style={{
                                            opacity: showCorrectAnswer ? 1 : 0,
                                            transform: showCorrectAnswer
                                                ? 'translateY(0)'
                                                : 'translateY(-2px)',
                                            transition: `opacity ${THEME.transitions.fast} ease-in-out, transform ${THEME.transitions.fast} ease-in-out`,
                                        }}
                                    >
                                        <p
                                            className="text-center text-2xl mb-1"
                                            style={{
                                                color: THEME.colors.primary,
                                                fontFamily: THEME.fonts.gothic,
                                            }}
                                        >
                                            {[currentVocab.reading.primary, ...currentVocab.reading.alternatives].join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Correct Answer Feedback */}
                        {feedback?.show && feedback.correct && (
                            <div
                                className="border"
                                style={{
                                    backgroundColor: THEME.colors.surface,
                                    borderColor: THEME.colors.accent,
                                    borderRadius: `${THEME.sizes.borderRadius}px`,
                                    padding: `${THEME.spacing.feedbackPadding}px`,
                                }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle
                                            cx="10"
                                            cy="10"
                                            r="9"
                                            stroke={THEME.colors.accent}
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M6 10L9 13L14 7"
                                            stroke={THEME.colors.accent}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <p
                                        className="text-center text-sm font-medium"
                                        style={{
                                            color: THEME.colors.accent,
                                            fontFamily: THEME.fonts.gothic,
                                        }}
                                    >
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
                                className="w-full font-medium rounded transition-colors"
                                style={{
                                    backgroundColor: computed.canSubmit
                                        ? THEME.colors.accent
                                        : THEME.colors.divider,
                                    color: THEME.colors.surface,
                                    height: `${THEME.sizes.buttonHeight}px`,
                                    marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                    borderRadius: `${THEME.sizes.borderRadius}px`,
                                    fontFamily: THEME.fonts.serif,
                                    cursor: computed.canSubmit ? 'pointer' : 'not-allowed',
                                }}
                                onMouseEnter={(e) => {
                                    if (computed.canSubmit) {
                                        e.currentTarget.style.backgroundColor = THEME.colors.accentHover;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (computed.canSubmit) {
                                        e.currentTarget.style.backgroundColor = THEME.colors.accent;
                                    }
                                }}
                            >
                                Submit
                            </button>
                        ) : (
                            !feedback.correct && (
                                <button
                                    ref={continueRef}
                                    type="submit"
                                    className="w-full font-medium rounded transition-colors"
                                    style={{
                                        backgroundColor: THEME.colors.accent,
                                        color: THEME.colors.surface,
                                        height: `${THEME.sizes.buttonHeight}px`,
                                        marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                        borderRadius: `${THEME.sizes.borderRadius}px`,
                                        fontFamily: THEME.fonts.serif,
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            THEME.colors.accentHover)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor = THEME.colors.accent)
                                    }
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
