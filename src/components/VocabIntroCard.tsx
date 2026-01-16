import type {Vocabulary} from "../models/vocabulary.model";
import {Card} from "./ui/Card";
import {THEME} from "../commons/theme";
import {CardDivider, CardSection} from "./ui/CardSection";
import {Button} from "./ui/Button";
import {useEffect, useRef} from "react";


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
                    <div
                        style={{
                            fontSize: THEME.fontSizes.kanji,
                            fontFamily: THEME.fonts.mincho,
                            color: THEME.colors.primary,
                            lineHeight: 1,
                        }}
                    >
                        {vocab.writtenForm.kanji}
                    </div>

                    <div
                        className="flex flex-row justify-center items-center gap-1 mt-4"
                        style={{
                            fontSize: THEME.fontSizes.base,
                            fontFamily: THEME.fonts.gothic,
                            color: THEME.colors.secondary,
                        }}
                    >
                        {[vocab.reading.primary, ...vocab.reading.alternatives].map((v => (<span>{v}</span>)))}
                    </div>
                </div>
            </CardSection>

            {/* Meanings */}
            <CardSection>
                <p
                    className="text-center"
                    style={{
                        fontFamily: THEME.fonts.serif,
                        fontSize: THEME.fontSizes.base,
                        color: THEME.colors.meaningMuted,
                        lineHeight: 1.6,
                    }}
                >
                    {vocab.senses.map((sense, i) => (<span>{sense.glosses.join(', ')}{i !== vocab.senses.length - 1 ? ', ' : ''}</span>))}
                </p>
            </CardSection>

            <CardDivider />

            <form onSubmit={onLearn} className="flex gap-4" ref={formRef}>
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