import React, {useState} from "react";
import type {VocabProgress, Vocabulary} from "../../models/vocabulary.model.ts";
import {THEME} from "../../commons/theme.ts";
import {CONSTANTS} from "../../commons/constants.ts";

export const QuizCard: React.FC<{
    vocabulary: Vocabulary;
    progress: VocabProgress;
    onSubmit: (answer: string) => void;
    feedback: { show: boolean; correct: boolean; message: string } | null;
}> = ({ vocabulary, progress, onSubmit, feedback }) => {
    const [answer, setAnswer] = useState('');

    const handleSubmit = () => {
        if (answer.trim()) {
            onSubmit(answer);
            setAnswer('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !feedback?.show) {
            handleSubmit();
        }
    };

    return (
        <div
            className="border rounded p-12 w-full max-w-2xl"
            style={{
                backgroundColor: THEME.colors.surface,
                borderColor: THEME.colors.divider
            }}
        >
            <div className="mb-8">
                <div className="flex items-center justify-between">
          <span
              className="text-xs font-sans uppercase tracking-wide"
              style={{ color: THEME.colors.secondary }}
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
                    className="text-8xl font-japanese-serif mb-6 leading-none"
                    style={{ color: THEME.colors.primary }}
                >
                    {vocabulary.kanji}
                </div>
                <p
                    className="font-sans text-base"
                    style={{ color: THEME.colors.secondary }}
                >
                    {vocabulary.meaning}
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="answer"
                        className="block text-sm font-sans mb-2"
                        style={{ color: THEME.colors.secondary }}
                    >
                        Reading (hiragana)
                    </label>
                    <input
                        id="answer"
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-4 py-3 border-2 rounded font-japanese-sans text-2xl text-center focus:outline-none transition-colors"
                        style={{
                            borderColor: THEME.colors.divider,
                            color: THEME.colors.primary,
                        }}
                        onFocus={(e) => e.target.style.borderColor = THEME.colors.accent}
                        onBlur={(e) => e.target.style.borderColor = THEME.colors.divider}
                        placeholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
                        autoFocus
                        disabled={feedback?.show}
                    />
                </div>

                {feedback?.show && (
                    <div
                        className="p-4 border rounded"
                        style={{
                            backgroundColor: feedback.correct ? THEME.colors.surface : THEME.colors.errorBg,
                            borderColor: feedback.correct ? THEME.colors.accent : THEME.colors.error,
                        }}
                    >
                        <p
                            className="text-center font-sans text-sm"
                            style={{ color: feedback.correct ? THEME.colors.accent : THEME.colors.error }}
                        >
                            {feedback.message}
                        </p>
                        {!feedback.correct && (
                            <p
                                className="text-center font-japanese-sans text-xl mt-2"
                                style={{ color: THEME.colors.primary }}
                            >
                                {vocabulary.reading}
                            </p>
                        )}
                    </div>
                )}

                {!feedback?.show && (
                    <button
                        onClick={handleSubmit}
                        className="w-full font-sans font-medium py-3 px-6 rounded transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accentHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accent}
                    >
                        Submit
                    </button>
                )}
            </div>
        </div>
    );
};