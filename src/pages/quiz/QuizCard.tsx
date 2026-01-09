import React, { useEffect, useRef, useState } from 'react';
import { THEME } from '../../commons/theme';
import { CONSTANTS } from '../../commons/constants';
import { FONT_IMPORTS } from '../../main';
import {useQuiz} from "../../context/QuizContext.tsx";

export const QuizCard: React.FC = () => {
    const { state, actions, computed } = useQuiz();
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const continueRef = useRef<HTMLButtonElement | null>(null);

    // Get data from centralized state
    const { currentVocab, userAnswer, feedback, progress } = state;
    const currentProgress = progress?.activeQueue[0];

    if (!currentVocab || !currentProgress) return null;

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
            actions.continueToNext();
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div
                className="border rounded p-12 w-full max-w-2xl"
                style={{
                    backgroundColor: THEME.colors.surface,
                    borderColor: THEME.colors.divider,
                }}
            >
                <style>{FONT_IMPORTS}</style>

                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
            <span
                className="text-xs uppercase tracking-wide"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.gothic,
                }}
            >
              Progress
            </span>
                        <div className="flex gap-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 rounded-full border-2"
                                    style={{
                                        backgroundColor:
                                            i < currentProgress.correctCount
                                                ? THEME.colors.accent
                                                : 'transparent',
                                        borderColor:
                                            i < currentProgress.correctCount
                                                ? THEME.colors.accent
                                                : THEME.colors.divider,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Kanji Display */}
                <div className="text-center mb-12">
                    <div
                        className="mb-6 leading-none"
                        style={{
                            color: THEME.colors.primary,
                            fontSize: THEME.fontSizes.kanji,
                            fontFamily: THEME.fonts.mincho,
                        }}
                    >
                        {currentVocab.kanji}
                    </div>
                    {feedback?.show && (
                        <p
                            className="text-base"
                            style={{
                                color: THEME.colors.meaningMuted,
                                fontFamily: THEME.fonts.serif,
                            }}
                        >
                            {currentVocab.meanings[0]}
                        </p>
                    )}
                </div>

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
                                        {currentVocab.readings.join(', ')}
                                    </p>
                                    <p
                                        className="text-center text-sm"
                                        style={{
                                            color: THEME.colors.secondary,
                                            fontFamily: THEME.fonts.serif,
                                        }}
                                    >
                                        {currentVocab.meanings.join(', ')}
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
            </div>
        </form>
    );
};