import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { GrammarPoint } from "../../models/grammar.model";
import { Card } from "../../components/ui/Card";
import { CardDivider, CardSection } from "../../components/ui/CardSection";
import { Button } from "../../components/ui/Button";
import { JlptChip } from "../../components/JlptChip";
import { MasteryRing } from "../../components/MasteryRing";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { useQuiz } from "../../context/useQuiz";

interface GrammarIntroCardProps {
    grammarPoint: GrammarPoint;
    onLearn: () => void;
    onSkip: () => void;
}

export function GrammarIntroCard({ grammarPoint, onLearn, onSkip }: GrammarIntroCardProps) {
    const formRef = useRef<HTMLFormElement | null>(null);
    const { isMobile } = useResponsive();
    const { currentGrammarProgress } = useQuiz();

    useEffect(() => {
        const lastChild = formRef.current?.lastElementChild as HTMLElement | undefined;
        lastChild?.focus();
    }, []);

    return (
        <Card size="lg">
            <CardSection>
                <div className="flex justify-end mb-2">
                    <MasteryRing memoryStrength={currentGrammarProgress?.entry.memoryStrength ?? 0} size={40} />
                </div>
                <div className="text-center">
                    <div className="flex justify-center mb-3">
                        <JlptChip level={grammarPoint.jlptLevel} />
                    </div>
                    <h2 className="text-primary font-mincho text-2xl leading-snug">
                        <Link to={`/grammar/${grammarPoint.id}`} className="hover:underline">
                            {grammarPoint.title}
                        </Link>
                    </h2>
                </div>
            </CardSection>

            <CardSection>
                <div className="text-center font-serif text-base text-meaning-muted leading-relaxed">
                    {grammarPoint.shortExplanation}
                </div>
            </CardSection>

            <CardSection>
                <div className="rounded-lg border border-divider bg-feedback-background px-4 py-3 text-center">
                    <p className="uppercase tracking-wide text-label-neutral text-xs mb-1 font-gothic">
                        Formation
                    </p>
                    <p className="text-primary font-gothic text-sm">
                        {grammarPoint.formation}
                    </p>
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
                    {isMobile ? 'Learn' : 'Learn this grammar point'}
                </Button>
            </form>
        </Card>
    );
}
