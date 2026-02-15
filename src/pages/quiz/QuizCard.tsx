import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { CONSTANTS } from "../../commons/constants";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup } from "../../models/data.model";
import type { Tags } from "../../models/data.model";
import { BaseQuizCard } from "./BaseQuizCard";

interface QuizCardProps {
    onKanjiClick?: () => void;
}

export function QuizCard({ onKanjiClick }: QuizCardProps) {
    const { state, currentProgress } = useQuiz();
    const { isMobile } = useResponsive();

    const { currentVocab, feedback } = state;

    if (!currentVocab) return null;

    return (
        <BaseQuizCard
            inputLabel="Reading (hiragana)"
            inputPlaceholder={CONSTANTS.quiz.hiraganaAnswerPlaceholder}
            renderCorrectAnswer={() => (
                <div className="text-center text-2xl mb-1 text-primary font-gothic">
                    {feedback?.type === 'minor_error'
                        ? feedback.matchedAnswer
                        : [currentVocab.reading.primary, ...currentVocab.reading.alternatives].join(', ')}
                </div>
            )}
        >
            {isMobile ? (
                // Horizontal layout for all mobile views
                <div className="mb-4">
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
                                ).slice(0, 3).map(rawTag => (
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
        </BaseQuizCard>
    );
}
