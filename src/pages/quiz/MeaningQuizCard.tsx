import { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup } from "../../models/data.model";
import type { Tags } from "../../models/data.model";
import type { Sentence } from "../../models/sentence.model";
import { BaseQuizCard } from "./BaseQuizCard";

interface MeaningQuizCardProps {
    onKanjiClick?: () => void;
}

export function MeaningQuizCard({ onKanjiClick }: MeaningQuizCardProps) {
    const { state, currentProgress } = useQuiz();
    const { isMobile } = useResponsive();

    // Get data from centralized state
    const { currentVocab, currentSentences, feedback, progress } = state;

    // Pick a random sentence on mount (or when vocab changes)
    const [sentence, setSentence] = useState<Sentence | null>(null);

    useEffect(() => {
        if (currentSentences && currentSentences.length > 0) {
            const idx = Math.floor(Math.random() * currentSentences.length);
            setSentence(currentSentences[idx]);
        } else {
            setSentence(null);
        }
    }, [currentVocab?.id, currentSentences]); // Re-roll when vocab changes

    if (!currentVocab || !progress) return null;

    return (
        <BaseQuizCard
            inputLabel="Meaning (English)"
            inputPlaceholder="Type the meaning..."
        >
            {/* Header: Meaning Quiz Label + Mastery */}
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase tracking-widest text-secondary font-gothic font-semibold">
                    What does this mean?
                </span>
                {!isMobile && (
                    <div className="flex flex-col items-center gap-1">
                        <MasteryRing memoryStrength={currentProgress?.meaning.memoryStrength ?? 0} size={50} />
                        <span className="text-[10px] text-tertiary uppercase tracking-widest font-gothic font-semibold">
                            Mastery
                        </span>
                    </div>
                )}
            </div>

            {/* Content: Sentence OR Kanji */}
            <div className="text-center mb-6">
                {sentence ? (
                    <div className="mb-4">
                        <div className="text-2xl font-serif text-primary mb-2 leading-relaxed">
                            {sentence.original}
                        </div>
                    </div>
                ) : (
                    // Fallback to minimal Kanji display if no sentence
                    <div
                        className={`text-5xl leading-none text-primary font-mincho mb-4 ${onKanjiClick && feedback?.show ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        onClick={() => feedback?.show && onKanjiClick?.()}
                    >
                        {currentVocab.writtenForm.kanji}
                    </div>
                )}

                {/* Target Word Display (Context helper) */}
                {sentence && (
                    <div className="text-lg text-secondary font-mincho">
                        {currentVocab.writtenForm.kanji}
                    </div>
                )}

                {/* POS Tags */}
                {currentVocab.senses.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {Array.from(
                            new Set(
                                currentVocab.senses.flatMap(sense => [
                                    ...sense.pos,
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

            </div>

            {/* Glosses — feedback only */}
            {feedback?.show && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm space-y-1 text-meaning-muted font-serif"
                >
                    <p className="font-bold text-primary mb-1">Meanings:</p>
                    {currentVocab.senses.map((sense, index) => (
                        <p key={index}>
                            {sense.glosses.join(', ')}
                        </p>
                    ))}

                    {sentence && sentence.en && (
                        <div className="mt-4 pt-4 border-t border-divider">
                            <p className="font-bold text-primary mb-1">Translation:</p>
                            <p className="italic text-secondary">
                                {sentence.en[0].text /* Just show first translation */}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </BaseQuizCard>
    );
}
