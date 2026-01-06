import React, {useState} from "react";
import type {VocabProgress, Vocabulary} from "../../models/vocabulary.model.ts";
import {THEME} from "../../commons/theme.ts";
import {CONSTANTS} from "../../commons/constants.ts";
import {FONT_IMPORTS} from "../../main.tsx";

export const QuizCard: React.FC<{
    vocabulary: Vocabulary;
    progress: VocabProgress;
    onSubmit: (answer: string) => void;
    onContinue: () => void;
    feedback: { show: boolean; correct: boolean; message: string } | null;
}> = ({ vocabulary, progress, onSubmit, onContinue, feedback }) => {
    const [answer, setAnswer] = useState('');
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const continueRef = React.useRef<HTMLButtonElement>(null);
    const canContinueManually = feedback && feedback?.show && !feedback.correct;

    // Clear input and focus when vocabulary changes
    React.useEffect(() => {
        console.debug('vocabulary', vocabulary.kanji)
        setAnswer('');
        setShowCorrectAnswer(false);
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [vocabulary.id]);

    // Handle incorrect answer reveal animation
    React.useEffect(() => {
        if (feedback?.show && !feedback.correct) {
            setShowCorrectAnswer(false);
            const timer = setTimeout(() => {
                setShowCorrectAnswer(true);
            }, CONSTANTS.quiz.incorrectAnswerRevealDelay);
            return () => clearTimeout(timer);
        } else if (!feedback?.show) {
            setShowCorrectAnswer(false);
        }
    }, [feedback]);

    const handleSubmit = () => {
        if (answer.trim() && !feedback?.show) {
            onSubmit(answer);
            // Focus continue button after incorrect answer
            setTimeout(() => continueRef.current?.focus(), CONSTANTS.quiz.incorrectAnswerRevealDelay + 50);
        }
    };

    const handleContinue = () => {
        console.debug('handle continue')
        onContinue();
    };

    if (!vocabulary) {
        return <div>Loading…</div>;
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();

                if (!feedback?.show) {
                    handleSubmit();
                } else if (canContinueManually) {
                    handleContinue();
                }
            }}
        >
            <div
                className="border rounded p-12 w-full max-w-2xl"
                style={{
                    backgroundColor: THEME.colors.surface,
                    borderColor: THEME.colors.divider
                }}
            >
                <style>{FONT_IMPORTS}</style>
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
                                        backgroundColor: i < progress.correctCount ? THEME.colors.accent : 'transparent',
                                        borderColor: i < progress.correctCount ? THEME.colors.accent : THEME.colors.divider,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center mb-12">
                    <div
                        className="mb-6 leading-none"
                        style={{
                            color: THEME.colors.primary,
                            fontSize: THEME.fontSizes.kanji,
                            fontFamily: THEME.fonts.mincho,
                        }}
                    >
                        {vocabulary.kanji}
                    </div>
                    {feedback?.show && (
                        <p
                            className="text-base"
                            style={{
                                color: THEME.colors.meaningMuted,
                                fontFamily: THEME.fonts.serif,
                            }}
                        >
                            {vocabulary.meaning}
                        </p>
                    )}
                </div>

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
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className="w-full px-4 py-3 border rounded text-2xl text-center focus:outline-none transition-colors"
                            style={{
                                borderColor: THEME.colors.divider,
                                color: THEME.colors.primary,
                                backgroundColor: THEME.colors.surface,
                                fontFamily: THEME.fonts.gothic,
                            }}
                            onFocus={(e) => e.target.style.borderColor = THEME.colors.accent}
                            onBlur={(e) => e.target.style.borderColor = THEME.colors.divider}
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
                                        transform: showCorrectAnswer ? 'translateY(0)' : 'translateY(-2px)',
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
                                        {vocabulary.reading}
                                    </p>
                                    <p
                                        className="text-center text-sm"
                                        style={{
                                            color: THEME.colors.secondary,
                                            fontFamily: THEME.fonts.serif,
                                        }}
                                    >
                                        {vocabulary.meaning}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

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
                                    <circle cx="10" cy="10" r="9" stroke={THEME.colors.accent} strokeWidth="2"/>
                                    <path d="M6 10L9 13L14 7" stroke={THEME.colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

                    {!feedback?.show ? (
                        <button
                            className="w-full font-medium rounded transition-colors"
                            style={{
                                backgroundColor: THEME.colors.accent,
                                color: THEME.colors.surface,
                                height: `${THEME.sizes.buttonHeight}px`,
                                marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                fontFamily: THEME.fonts.serif,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accentHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accent}
                        >
                            Submit
                        </button>
                    ) : !feedback.correct && (
                        <button
                            ref={continueRef}
                            className="w-full font-medium rounded transition-colors"
                            style={{
                                backgroundColor: THEME.colors.accent,
                                color: THEME.colors.surface,
                                height: `${THEME.sizes.buttonHeight}px`,
                                marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                fontFamily: THEME.fonts.serif,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accentHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accent}
                            disabled={!canContinueManually}
                        >
                            Continue
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
};