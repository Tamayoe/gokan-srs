import { motion } from "framer-motion";
import { useQuiz } from "../../context/useQuiz";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup } from "../../models/data.model";
import type { Tags } from "../../models/data.model";

import { BaseQuizCard } from "./BaseQuizCard";
import { InteractiveSentence } from "../../components/InteractiveSentence";

interface MeaningQuizCardProps {
    onKanjiClick?: () => void;
    onVocabClick?: (vocabId: string) => void;
}

export function MeaningQuizCard({ onKanjiClick, onVocabClick }: MeaningQuizCardProps) {
    const { state, currentProgress } = useQuiz();
    const { isMobile } = useResponsive();

    // Get data from centralized state
    const { currentVocab, currentSentences, feedback, progress } = state;

    // Get persisted sentence from state
    const sentence = currentSentences && state.currentSentenceId
        ? currentSentences.find(s => s.id === state.currentSentenceId) || null
        : null;

    if (!currentVocab || !progress) return null;

    return (
        <BaseQuizCard
            inputLabel="Meaning (English)"
            inputPlaceholder="Type the meaning..."
        >
            {/* Header: Meaning Quiz Label + Mastery */}
            <div className="flex flex-col items-center mb-8">
                <div className="flex justify-end w-full mb-4">
                    {!isMobile && (
                        <div className="flex flex-col items-center gap-1 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                            <MasteryRing memoryStrength={currentProgress?.meaning.memoryStrength ?? 0} size={50} />
                            <span className="text-[10px] text-tertiary uppercase tracking-widest font-gothic font-semibold">
                                Mastery
                            </span>
                        </div>
                    )}
                </div>

                <h2 className="text-xl md:text-2xl font-serif text-secondary text-center leading-relaxed max-w-2xl mx-auto">
                    {sentence ? (
                        <>
                            What is the original meaning of <span className="text-primary font-bold mx-1">{currentVocab.writtenForm.kanji}</span> in this sentence?
                        </>
                    ) : (
                        <>
                            What is the meaning of this word?
                        </>
                    )}
                </h2>
            </div>

            {/* Content: Sentence OR Kanji */}
            <div className="text-center mb-6">
                {sentence ? (
                    <div className="mb-4">
                        <div className="text-2xl font-serif text-primary mb-2 leading-relaxed">
                            <InteractiveSentence
                                sentence={sentence}
                                targetVocabId={currentVocab.id}
                                onVocabClick={onVocabClick}
                            />
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
