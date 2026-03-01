import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import type { Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { VocabularyService } from '@gokan-srs/core/services/vocabulary.service';
import { useNavigate } from "react-router-dom";
import { useResponsive } from "../../context/Responsive/useResponsive";

interface Props {
    vocab: Vocabulary;
}

export function VocabRelationshipsCard({ vocab }: Props) {
    const { isMobile } = useResponsive();
    const navigate = useNavigate();

    const [parents, setParents] = useState<Vocabulary[]>([]);
    const [components, setComponents] = useState<Vocabulary[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter IDs
    const componentIds = vocab.components || [];
    const parentIds = vocab.parents || [];

    const INITIAL_COUNT = 5;
    const isExpandable = componentIds.length > INITIAL_COUNT || parentIds.length > INITIAL_COUNT;

    const displayedComponentIds = isExpanded ? componentIds : componentIds.slice(0, INITIAL_COUNT);
    const displayedParentIds = isExpanded ? parentIds : parentIds.slice(0, INITIAL_COUNT);

    // Reset expansion state when navigating to a new vocabulary
    useEffect(() => {
        setIsExpanded(false);
    }, [vocab.id]);

    useEffect(() => {
        const load = async () => {
            if (displayedParentIds.length > 0) {
                const p = await Promise.all(displayedParentIds.map(id => VocabularyService.loadVocab(id).catch(() => null)));
                setParents(p.filter(v => v !== null) as Vocabulary[]);
            } else {
                setParents([]);
            }

            if (displayedComponentIds.length > 0) {
                const c = await Promise.all(displayedComponentIds.map(id => VocabularyService.loadVocab(id).catch(() => null)));
                setComponents(c.filter(v => v !== null) as Vocabulary[]);
            } else {
                setComponents([]);
            }
        };
        load();
    }, [isExpanded, vocab]); // Re-load when expanding

    if (componentIds.length === 0 && parentIds.length === 0) {
        return null;
    }

    const renderVocabList = (vocabs: Vocabulary[]) => {
        return (
            <div className="space-y-3 mt-2">
                {vocabs.map((v) => (
                    <div
                        key={v.id}
                        onClick={() => navigate(`/vocab/${v.id}`)}
                        className="border-l-2 border-divider pl-3 cursor-pointer hover:border-accent transition-colors group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mincho text-xl text-primary group-hover:text-accent transition-colors">
                                {v.writtenForm.kanji}
                            </span>
                            <span className="font-gothic font-bold text-secondary">
                                {v.reading.primary}
                            </span>
                            <span className="text-xs text-tertiary font-mono ml-auto">
                                ID: {v.id}
                            </span>
                        </div>
                        <div className="text-sm text-meaning-muted font-serif line-clamp-2">
                            {v.senses && v.senses[0] ? v.senses[0].glosses.join(', ') : 'No definition available'}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card size={isMobile ? "sm" : "md"}>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Relationships</h2>
            <div className="space-y-6">
                {componentIds.length > 0 && (
                    <div>
                        <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-2 flex items-center justify-between">
                            <span>Consists of ({componentIds.length})</span>
                        </div>
                        {renderVocabList(components)}
                    </div>
                )}

                {parentIds.length > 0 && (
                    <div className={componentIds.length > 0 ? "pt-4 border-t border-divider/50" : ""}>
                        <div className="text-xs text-tertiary uppercase tracking-wider font-gothic mb-2 flex items-center justify-between">
                            <span>Used in Derived Words ({parentIds.length})</span>
                        </div>
                        {renderVocabList(parents)}
                    </div>
                )}
            </div>

            {isExpandable && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-sm font-gothic text-accent hover:text-accent/80 transition-colors py-2 px-4 rounded-md border border-accent/20 hover:bg-accent/5 w-full md:w-auto"
                    >
                        {isExpanded ? "Show fewer relationships" : "Show all relationships"}
                    </button>
                </div>
            )}
        </Card>
    );
}
