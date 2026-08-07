import { Link } from "react-router-dom";
import type { GrammarPoint } from "../../models/grammar.model";
import { CardSection } from "../../components/ui/CardSection";
import { JlptChip } from "../../components/JlptChip";
import { MasteryRing } from "../../components/MasteryRing";
import { IntroCardShell } from "../../components/IntroCardShell";
import { useQuiz } from "../../context/useQuiz";

interface GrammarIntroCardProps {
    grammarPoint: GrammarPoint;
    onLearn: () => void;
    onSkip: () => void;
}

export function GrammarIntroCard({ grammarPoint, onLearn, onSkip }: GrammarIntroCardProps) {
    const { currentGrammarProgress } = useQuiz();

    return (
        <IntroCardShell onLearn={onLearn} onSkip={onSkip} learnLabel="Learn this grammar point">
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
        </IntroCardShell>
    );
}
