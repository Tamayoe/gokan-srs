import { useState } from "react";
import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { CONSTANTS } from "../../commons/constants";
import { MasteryRing } from "../../components/MasteryRing";
import { Combine } from "lucide-react";
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
    const [isExpanded, setIsExpanded] = useState(false);

    if (!currentVocab) return null;

    const maxMobileDefs = 3;
    const maxDesktopDefs = 5;
    const currentMaxDefs = isMobile ? maxMobileDefs : maxDesktopDefs;
    const hasMoreDefs = currentVocab.senses.length > currentMaxDefs;
    
    const displayedSenses = isExpanded ? currentVocab.senses : currentVocab.senses.slice(0, currentMaxDefs);

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
                            className={`relative inline-flex items-center justify-center text-5xl leading-none text-primary font-mincho mb-2 ${onKanjiClick && feedback?.show ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            onClick={() => feedback?.show && onKanjiClick?.()}
                        >
                            <span>{currentVocab.writtenForm.kanji}</span>
                            {/* Merged Entry Icon */}
                            {currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 && (
                                <span className="absolute -right-6 -top-1">
                                    <Combine size={18} className="text-divider opacity-40" />
                                </span>
                            )}
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
                                        className="px-1.5 py-0.5 text-[9px] rounded bg-accent/10 text-accent font-gothic font-medium dark:bg-accent/15 whitespace-nowrap"
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
                        </div>
                    </div>

                    {/* Kanji Display */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div
                                className={`relative inline-flex items-start leading-none text-primary text-kanji font-mincho ${onKanjiClick && feedback?.show ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                onClick={() => feedback?.show && onKanjiClick?.()}
                                title={currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 ? "Merged Entry (combines multiple JMDict words)" : undefined}
                            >
                                <span>{currentVocab.writtenForm.kanji}</span>
                                {/* Merged Entry Icon */}
                                {currentVocab.mergedVocabs && currentVocab.mergedVocabs.length > 1 && (
                                    <span className="absolute -right-8 top-0">
                                        <Combine size={24} className="text-divider opacity-30" />
                                    </span>
                                )}
                            </div>
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
                                            className="px-2 py-0.5 text-xs rounded bg-accent/10 text-accent font-gothic font-medium dark:bg-accent/15"
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
                    className="text-center text-sm space-y-2 text-meaning-muted font-serif"
                >
                    {isMobile ? (
                        displayedSenses.map((sense, index) => (
                            <p key={index}>
                                {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                    <span className="text-xs text-tertiary mr-1 font-gothic">[{sense.appliesToReadings.join(', ')}]</span>
                                )}
                                {sense.glosses.join(', ')}
                            </p>
                        ))
                    ) : (
                        displayedSenses.map((sense, index) => (
                            <p key={index}>
                                {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                    <span className="text-xs text-tertiary mr-2 font-gothic">[{sense.appliesToReadings.join(', ')}]</span>
                                )}
                                {sense.glosses.join(', ')}
                            </p>
                        ))
                    )}
                    
                    {hasMoreDefs && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-secondary hover:text-primary transition-colors py-1 cursor-pointer font-gothic"
                        >
                            {isExpanded ? "Show less" : `+${currentVocab.senses.length - currentMaxDefs} more definitions`}
                        </button>
                    )}
                </motion.div>
            )}
        </BaseQuizCard>
    );
}
