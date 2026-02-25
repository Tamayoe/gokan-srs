import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { VocabularyService } from '../../services/vocabulary.service';
import type { Sentence } from '../../models/sentence.model';
import { InteractiveSentence } from '../../components/InteractiveSentence';

interface VocabSentencesCardProps {
    vocabId: string;
}

export function VocabSentencesCard({ vocabId }: VocabSentencesCardProps) {
    const navigate = useNavigate();
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Load Sentences
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        VocabularyService.loadSentences(vocabId).then(data => {
            if (mounted && data) {
                setSentences(data);
            }
            setLoading(false);
        });
        return () => { mounted = false; };
    }, [vocabId]);

    // Note: We no longer need to load referenced vocabs because InteractiveSentence
    // uses the pre-calculated 'matches' from the sentence data.

    if (loading) {
        return null;
    }

    if (sentences.length === 0) {
        return null; // Don't show card if no sentences
    }

    return (
        <Card>
            <h2 className="text-lg font-gothic font-semibold text-primary mb-4">Example Sentences</h2>
            <div className="space-y-4">
                {sentences.map((sentence) => (
                    <div key={sentence.id} className="pb-4 last:pb-0 border-b last:border-b-0 border-divider">
                        <div className="text-xl leading-relaxed text-primary mb-1">
                            <InteractiveSentence
                                sentence={sentence}
                                targetVocabId={vocabId}
                                onVocabClick={(vid) => navigate(`/vocab/${vid}`)}
                                showFurigana={true}
                            />
                        </div>
                        {sentence.en && sentence.en.length > 0 && (
                            <div className="text-sm text-secondary font-serif">
                                {sentence.en[0].text}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
}
