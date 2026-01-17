import type { Vocabulary } from "../models/vocabulary.model";
import { Card } from "./ui/Card";

import { CardDivider, CardSection } from "./ui/CardSection";
import { Button } from "./ui/Button";
import { useEffect, useRef } from "react";


interface IntroVocabCardProps {
    vocab: Vocabulary;
    onLearn: () => void;
    onSkip: () => void;
}

export default function VocabIntroCard({ vocab, onLearn, onSkip }: IntroVocabCardProps) {
    const formRef = useRef<HTMLFormElement | null>(null);

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
                    <div className="text-primary font-mincho leading-none text-kanji">
                        {vocab.writtenForm.kanji}
                    </div>

                    <div className="flex flex-row justify-center items-center gap-1 mt-4 text-base font-gothic text-secondary">
                        {[vocab.reading.primary, ...vocab.reading.alternatives].map((v => (<span>{v}</span>)))}
                    </div>
                </div>
            </CardSection>

            {/* Meanings */}
            <CardSection>
                <p className="text-center font-serif text-base text-meaning-muted leading-relaxed">
                    {vocab.senses.map((sense, i) => (<span>{sense.glosses.join(', ')}{i !== vocab.senses.length - 1 ? ', ' : ''}</span>))}
                </p>
            </CardSection>

            <CardDivider />

            <form onSubmit={onLearn} className="flex flex-col md:flex-row gap-4" ref={formRef}>
                <Button variant="secondary" className="flex-1" onClick={onSkip}>
                    I already know this
                </Button>

                <Button variant="primary" className="flex-1" type="submit">
                    Learn this word
                </Button>
            </form>
        </Card>
    );
}