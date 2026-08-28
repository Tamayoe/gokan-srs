import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { GrammarPoint } from "../../models/grammar.model";
import { Card } from "../../components/ui/Card";
import { MasteryRing } from "../../components/MasteryRing";
import { JlptChip } from "../../components/JlptChip";
import { Button } from "../../components/ui/Button";
import { LoadingScreen } from "../../components/LoadingScreen";
import { SRSHistoryGraph } from "../../components/SRSHistoryGraph";
import { useResponsive } from "../../context/Responsive/useResponsive";
import { useQuiz } from "../../context/useQuiz";
import { GrammarService } from "../../services/grammar.service";
import { THEME } from "../../commons/theme";
import { GrammarRelatedPointsCard } from "./GrammarRelatedPointsCard";
import { InteractiveSentence } from "../../components/InteractiveSentence";
import { grammarExampleToSentence } from "../../utils/grammarSentence.utils";
import { ArrowLeft } from "lucide-react";

const FORMALITY_LABELS: Record<NonNullable<GrammarPoint['formalityLevel']>, string> = {
    'casual': 'Casual',
    'neutral': 'Neutral',
    'polite': 'Polite',
    'formal': 'Formal',
    'very-formal-literary': 'Very formal / literary',
};

/**
 * Route /grammar/:grammarId - a single grammar point's details outside of a
 * live review, mirroring VocabDetailScreen's layout and section conventions.
 */
export default function GrammarDetailScreen() {
    const { grammarId } = useParams<{ grammarId: string }>();
    const navigate = useNavigate();
    const { isMobile } = useResponsive();
    const { state, grammarActions } = useQuiz();
    const [point, setPoint] = useState<GrammarPoint | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!grammarId) return;

        setPoint(null);
        setError(null);

        GrammarService.loadGrammarPoint(grammarId)
            .then(setPoint)
            .catch(err => {
                console.error("Failed to load grammar point", err);
                setError("Could not load grammar point details.");
            });
    }, [grammarId]);

    const progress = state.progress?.grammarQueue.find(g => g.grammarId === grammarId);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div>
                    <h2 className="text-xl font-bold text-error mb-2">Error</h2>
                    <p className="text-secondary mb-4">{error}</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    if (!point) {
        return <LoadingScreen />;
    }

    const headerCard = (
        <Card size={isMobile ? "sm" : "md"}>
            <div className="flex flex-col items-center text-center gap-4">
                <div className="flex justify-end w-full">
                    <MasteryRing memoryStrength={progress?.entry.memoryStrength ?? 0} size={48} />
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <JlptChip level={point.jlptLevel} />
                    {point.formalityLevel && (
                        <span className="px-2 py-0.5 text-xs rounded border border-secondary/30 text-secondary font-gothic font-medium whitespace-nowrap">
                            {FORMALITY_LABELS[point.formalityLevel]}
                        </span>
                    )}
                </div>
                <div className="text-primary font-mincho text-3xl leading-snug">
                    {point.title}
                </div>
                {point.romaji && (
                    <div className="text-tertiary font-gothic text-sm -mt-2">
                        {point.romaji}
                    </div>
                )}
                {point.usageNote && (
                    <p className="text-sm text-secondary font-serif leading-relaxed max-w-md">
                        {point.usageNote}
                    </p>
                )}
                {!progress && (
                    <Button
                        className="w-full"
                        onClick={() => grammarActions.saveGrammarIntroChoice(point, 'learn')}
                    >
                        Add to Grammar Queue
                    </Button>
                )}
            </div>
        </Card>
    );

    const explanationCard = (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Explanation</h2>
            <div className="space-y-4">
                <p className="text-base text-meaning-muted font-serif leading-relaxed">
                    {point.shortExplanation}
                </p>
                <p className="text-sm text-secondary font-serif leading-relaxed">
                    {point.longExplanation}
                </p>
            </div>
        </Card>
    );

    const formationCard = (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Formation</h2>
            <div className="rounded-lg border border-divider bg-feedback-background px-4 py-3 text-center">
                <p className="text-primary font-gothic text-base">
                    {point.formation}
                </p>
            </div>
        </Card>
    );

    const examplesCard = (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">
                Example Sentences <span className="text-sm font-normal text-tertiary ml-2">({point.examples.length})</span>
            </h2>
            <div>
                {point.examples.map((example, i) => (
                    <div key={i} className={`pb-4 ${i < point.examples.length - 1 ? 'border-b border-divider mb-4' : ''}`}>
                        <div className="text-xl leading-relaxed text-primary mb-1">
                            <InteractiveSentence
                                sentence={grammarExampleToSentence(example, i)}
                                onVocabClick={(vid) => navigate(`/vocab/${vid}`)}
                                showFurigana={true}
                            />
                        </div>
                        <div className="text-sm text-tertiary font-gothic mb-1">
                            {example.romaji}
                        </div>
                        <div className="text-sm text-secondary font-serif">
                            {example.en}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );

    const relatedPointsCard = <GrammarRelatedPointsCard point={point} />;

    const statsCard = progress && progress.introductionAt ? (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Stats</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                        Reviews
                    </div>
                    <div className="text-xl text-primary font-gothic">
                        {progress.totalReviews}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                        Interval
                    </div>
                    <div className="text-xl text-primary font-gothic">
                        {progress.entry.interval.toFixed(1)}d
                    </div>
                </div>
                <div>
                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                        Introduced
                    </div>
                    <div className="text-base text-primary font-gothic">
                        {new Date(progress.introductionAt).toLocaleDateString()}
                    </div>
                </div>
                <div>
                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                        Next Review
                    </div>
                    <div className="text-base text-primary font-gothic">
                        {progress.entry.dueDate ? new Date(progress.entry.dueDate).toLocaleDateString() : 'Ready'}
                    </div>
                </div>
                <div className="col-span-2">
                    <SRSHistoryGraph
                        series={[{ key: 'grammar', label: 'Grammar', entry: progress.entry, color: THEME.mastery.loop1 }]}
                        introDate={progress.introductionAt ? new Date(progress.introductionAt) : null}
                    />
                </div>
            </div>
        </Card>
    ) : null;

    return (
        <div className="min-h-screen flex flex-col md:max-w-3xl md:mx-auto w-full animate-fade-in">
            {/* Header */}
            <div className="w-full flex items-center p-4 md:p-8 relative">
                <Button variant="ghost" onClick={() => navigate(-1)} className="absolute left-4 md:left-8">
                    <ArrowLeft className="inline-block w-4 h-4 mr-1 align-text-bottom" aria-hidden="true" />Back
                </Button>
                <h1 className="flex-1 text-center text-xl font-serif text-primary">
                    Grammar Point Details
                </h1>
            </div>

            {/* Content */}
            <main className="flex-1 p-4 md:p-8 pt-0 flex flex-col space-y-6">
                {headerCard}
                {explanationCard}
                {formationCard}
                {statsCard}
                {examplesCard}
                {relatedPointsCard}
            </main>
        </div>
    );
}
