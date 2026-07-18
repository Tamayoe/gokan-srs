import type { Vocabulary } from "../models/vocabulary.model";
import { Card } from "./ui/Card";

import { CardDivider, CardSection } from "./ui/CardSection";
import { Button } from "./ui/Button";
import { useEffect, useRef } from "react";
import { useResponsive } from "../context/Responsive/useResponsive";
import { Combine } from "lucide-react";
import { formatReadingList } from "../pages/quiz/quizFormatting";


interface IntroVocabCardProps {
    vocab: Vocabulary;
    onLearn: () => void;
    onSkip: () => void;
}

export default function VocabIntroCard({ vocab, onLearn, onSkip }: IntroVocabCardProps) {
    const formRef = useRef<HTMLFormElement | null>(null);
    const { isMobile } = useResponsive()

    useEffect(() => {
        if (formRef) {
            const lastChild = formRef.current?.lastElementChild as HTMLElement
            lastChild.focus()
        }
    }, []);

    return (
        <Card size="lg">
            {/* Kanji */}
            <CardSection>
                <div className="text-center">
                    <div
                        className="text-primary font-mincho leading-none text-kanji flex items-center justify-center gap-3"
                        title={vocab.mergedVocabs && vocab.mergedVocabs.length > 1 ? "Merged Entry (combines multiple JMDict words)" : undefined}
                    >
                        {vocab.writtenForm.kanji}
                        {vocab.mergedVocabs && vocab.mergedVocabs.length > 1 && (
                            <Combine size={40} className="text-divider" />
                        )}
                    </div>

                    <div className="flex flex-row justify-center items-center gap-1 mt-4 text-base font-gothic text-secondary/90 opacity-90">
                        {formatReadingList(vocab.reading)}
                    </div>
                </div>
            </CardSection>

            {/* Meanings */}
            <CardSection>
                <div className="text-center font-serif text-base text-meaning-muted leading-relaxed">
                    {vocab.senses.map((sense, i) => (
                        <span key={i}>
                            {sense.appliesToReadings && sense.appliesToReadings.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary mr-1 font-gothic">[{sense.appliesToReadings.join(', ')}]</span>
                            )}
                            {sense.glosses.join(', ')}
                            {i !== vocab.senses.length - 1 ? ', ' : ''}
                        </span>
                    ))}
                </div>
            </CardSection>

            <CardDivider />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onLearn();
                }}
                className="flex gap-4"
                ref={formRef}
            >
                <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={onSkip}
                    type="button"
                >
                    {isMobile ? 'Skip' : 'I already know this'}
                </Button>

                <Button variant="primary" className="flex-1" type="submit">
                    {isMobile ? 'Learn' : 'Learn this word'}
                </Button>
            </form>
        </Card>
    );
}
