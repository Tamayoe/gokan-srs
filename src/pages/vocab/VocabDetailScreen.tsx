import type { Vocabulary, VocabProgress } from "../../models/vocabulary.model";
import { Card } from "../../components/ui/Card";
import { MasteryRing } from "../../components/MasteryRing";
import { TagsLookup, type Tags } from "../../models/data.model";
import { useResponsive } from "../../context/Responsive/useResponsive";

import { Button } from "../../components/ui/Button";

interface VocabDetailScreenProps {
    vocab: Vocabulary;
    progress?: VocabProgress;
    onBack: () => void;
}

export function VocabDetailScreen({ vocab, progress, onBack }: VocabDetailScreenProps) {
    const { isMobile } = useResponsive();

    return (
        <div className="min-h-screen flex flex-col md:max-w-5xl md:mx-auto w-full animate-fade-in">
            {/* Header */}
            <div className="w-full flex items-center p-4 md:p-8 relative">
                <Button variant="ghost" onClick={onBack} className="absolute left-4 md:left-8">
                    ← Back
                </Button>
                <h1 className="flex-1 text-center text-xl font-serif text-primary">
                    Vocabulary Details
                </h1>
            </div>

            {/* Content */}
            <main className="flex-1 p-4 md:p-8 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                    {/* Left Column (Sticky on desktop) */}
                    <div className="md:col-span-5 md:sticky md:top-8 space-y-6">
                        {/* Kanji & Reading Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col items-center text-center gap-6'}`}>
                                <div className="flex-1">
                                    <div className="text-7xl md:text-8xl font-mincho text-primary mb-4">
                                        {vocab.writtenForm.kanji}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-3xl font-gothic text-secondary">
                                            {vocab.reading.primary}
                                        </div>
                                        {vocab.reading.alternatives.length > 0 && (
                                            <div className="text-sm text-tertiary font-gothic">
                                                Also: {vocab.reading.alternatives.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {progress && (
                                    <div className="flex flex-col items-center gap-2 border-t border-divider pt-6 w-full">
                                        <MasteryRing memoryStrength={progress.reading.memoryStrength} size={60} />
                                        <span className="text-xs text-tertiary uppercase tracking-wider font-gothic font-semibold">
                                            Mastery
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Metadata Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                                        Frequency
                                    </div>
                                    <div className="text-base text-primary font-gothic">
                                        #{vocab.frequency.kanjiRank.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                                        KKLC Step
                                    </div>
                                    <div className="text-base text-primary font-gothic">
                                        Step {vocab.progression.kklcStep}
                                    </div>
                                </div>
                                {vocab.usageHints?.examplePattern && (
                                    <div className="col-span-2 pt-2 border-t border-divider">
                                        <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                                            Usage Pattern
                                        </div>
                                        <div className="text-base text-primary font-mincho">
                                            {vocab.usageHints.examplePattern}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Progress Details */}
                        {progress && progress.introductionAt && (
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
                                            {progress.reading.interval.toFixed(1)}d
                                        </div>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-divider">
                                        <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-1">
                                            Introduced
                                        </div>
                                        <div className="text-base text-primary font-gothic">
                                            {new Date(progress.introductionAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-7 space-y-6">
                        {/* Meanings Card */}
                        <Card size={isMobile ? "sm" : "md"}>
                            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Meanings</h2>
                            <div className="space-y-6">
                                {vocab.senses.map((sense, index) => (
                                    <div key={index} className="pb-6 last:pb-0 border-b last:border-b-0 border-divider">
                                        {/* POS Tags */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {Array.from(new Set([...sense.pos, ...sense.misc.rawTags])).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 text-xs rounded bg-feedback-background text-secondary font-gothic"
                                                >
                                                    {TagsLookup[tag as Tags]}
                                                </span>
                                            ))}
                                        </div>
                                        {/* Glosses */}
                                        <p className="text-lg text-meaning-muted font-serif leading-relaxed">
                                            {sense.glosses.join(', ')}
                                        </p>

                                        {/* Related Compounds (Specific to Sense) */}
                                        {sense.related?.compounds && sense.related.compounds.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-divider/50">
                                                <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-2">
                                                    Related
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {sense.related.compounds.map((compound, i) => (
                                                        <span key={i} className="text-lg font-mincho text-primary/80">
                                                            {compound}
                                                            {i < sense.related.compounds.length - 1 && <span className="text-divider mx-2">|</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
