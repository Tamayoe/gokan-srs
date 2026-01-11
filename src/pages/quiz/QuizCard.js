import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from 'react';
import { THEME } from '../../commons/theme';
import { CONSTANTS } from '../../commons/constants';
import { useQuiz } from "../../context/QuizContext";
import { MasteryRing } from "../../components/MasteryRing";
export const QuizCard = () => {
    const { state, currentProgress, actions, computed } = useQuiz();
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const inputRef = useRef(null);
    const continueRef = useRef(null);
    // Get data from centralized state
    const { currentVocab, userAnswer, feedback, progress } = state;
    if (!currentVocab || !progress)
        return null;
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
        }
        else if (!feedback?.show) {
            setShowCorrectAnswer(false);
        }
    }, [feedback]);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!feedback?.show) {
            actions.submitAnswer();
        }
        else if (computed.canContinue) {
            actions.continueToNext().then();
        }
    };
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "border rounded p-12 w-full max-w-2xl", style: {
                backgroundColor: THEME.colors.surface,
                borderColor: THEME.colors.divider,
            }, children: [_jsx("div", { className: "flex justify-end mb-6", children: _jsx(MasteryRing, { mastery: currentProgress?.mastery ?? 0 }) }), _jsxs("div", { className: "text-center mb-12", children: [_jsx("div", { className: "mb-6 leading-none", style: {
                                color: THEME.colors.primary,
                                fontSize: THEME.fontSizes.kanji,
                                fontFamily: THEME.fonts.mincho,
                            }, children: currentVocab.kanji }), feedback?.show && (_jsx("p", { className: "text-base", style: {
                                color: THEME.colors.meaningMuted,
                                fontFamily: THEME.fonts.serif,
                            }, children: currentVocab.meanings[0] }))] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "answer", className: "block text-sm mb-2", style: {
                                        color: THEME.colors.secondary,
                                        fontFamily: THEME.fonts.gothic,
                                    }, children: "Reading (hiragana)" }), _jsx("input", { ref: inputRef, id: "answer", type: "text", value: userAnswer, onChange: (e) => actions.setAnswer(e.target.value), className: "w-full px-4 py-3 border rounded text-2xl text-center focus:outline-none transition-colors", style: {
                                        borderColor: THEME.colors.divider,
                                        color: THEME.colors.primary,
                                        backgroundColor: THEME.colors.surface,
                                        fontFamily: THEME.fonts.gothic,
                                    }, onFocus: (e) => (e.target.style.borderColor = THEME.colors.accent), onBlur: (e) => (e.target.style.borderColor = THEME.colors.divider), placeholder: CONSTANTS.quiz.hiraganaAnswerPlaceholder, autoFocus: true, disabled: feedback?.show }), _jsx("style", { children: `
              #answer::placeholder {
                color: ${THEME.colors.inputPlaceholder};
              }
            ` })] }), feedback?.show && !feedback.correct && (_jsxs("div", { className: "border rounded", style: {
                                backgroundColor: THEME.colors.feedbackBackground,
                                borderColor: THEME.colors.divider,
                                borderLeft: `${THEME.spacing.errorBorderWidth}px solid ${THEME.colors.errorAccent}`,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                padding: `${THEME.spacing.feedbackPadding}px`,
                            }, children: [_jsx("p", { className: "uppercase tracking-wide", style: {
                                        color: THEME.colors.labelNeutral,
                                        fontSize: THEME.fontSizes.labelSmall,
                                        marginBottom: `${THEME.spacing.labelMargin}px`,
                                        fontFamily: THEME.fonts.gothic,
                                    }, children: "Correct answer" }), showCorrectAnswer && (_jsxs("div", { style: {
                                        opacity: showCorrectAnswer ? 1 : 0,
                                        transform: showCorrectAnswer
                                            ? 'translateY(0)'
                                            : 'translateY(-2px)',
                                        transition: `opacity ${THEME.transitions.fast} ease-in-out, transform ${THEME.transitions.fast} ease-in-out`,
                                    }, children: [_jsx("p", { className: "text-center text-2xl mb-1", style: {
                                                color: THEME.colors.primary,
                                                fontFamily: THEME.fonts.gothic,
                                            }, children: currentVocab.readings.join(', ') }), _jsx("p", { className: "text-center text-sm", style: {
                                                color: THEME.colors.secondary,
                                                fontFamily: THEME.fonts.serif,
                                            }, children: currentVocab.meanings.join(', ') })] }))] })), feedback?.show && feedback.correct && (_jsx("div", { className: "border", style: {
                                backgroundColor: THEME.colors.surface,
                                borderColor: THEME.colors.accent,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                padding: `${THEME.spacing.feedbackPadding}px`,
                            }, children: _jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: [_jsx("circle", { cx: "10", cy: "10", r: "9", stroke: THEME.colors.accent, strokeWidth: "2" }), _jsx("path", { d: "M6 10L9 13L14 7", stroke: THEME.colors.accent, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("p", { className: "text-center text-sm font-medium", style: {
                                            color: THEME.colors.accent,
                                            fontFamily: THEME.fonts.gothic,
                                        }, children: feedback.message })] }) })), !feedback?.show ? (_jsx("button", { type: "submit", disabled: !computed.canSubmit, className: "w-full font-medium rounded transition-colors", style: {
                                backgroundColor: computed.canSubmit
                                    ? THEME.colors.accent
                                    : THEME.colors.divider,
                                color: THEME.colors.surface,
                                height: `${THEME.sizes.buttonHeight}px`,
                                marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                fontFamily: THEME.fonts.serif,
                                cursor: computed.canSubmit ? 'pointer' : 'not-allowed',
                            }, onMouseEnter: (e) => {
                                if (computed.canSubmit) {
                                    e.currentTarget.style.backgroundColor = THEME.colors.accentHover;
                                }
                            }, onMouseLeave: (e) => {
                                if (computed.canSubmit) {
                                    e.currentTarget.style.backgroundColor = THEME.colors.accent;
                                }
                            }, children: "Submit" })) : (!feedback.correct && (_jsx("button", { ref: continueRef, type: "submit", className: "w-full font-medium rounded transition-colors", style: {
                                backgroundColor: THEME.colors.accent,
                                color: THEME.colors.surface,
                                height: `${THEME.sizes.buttonHeight}px`,
                                marginTop: `${THEME.spacing.buttonMarginTop}px`,
                                borderRadius: `${THEME.sizes.borderRadius}px`,
                                fontFamily: THEME.fonts.serif,
                            }, onMouseEnter: (e) => (e.currentTarget.style.backgroundColor =
                                THEME.colors.accentHover), onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = THEME.colors.accent), children: "Continue" })))] })] }) }));
};
