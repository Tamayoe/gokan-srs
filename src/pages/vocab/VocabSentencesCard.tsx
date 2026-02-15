import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { VocabularyService } from '../../services/vocabulary.service';
import type { Sentence } from '../../models/sentence.model';
import type { Vocabulary } from '../../models/vocabulary.model';

interface VocabSentencesCardProps {
    vocabId: string;
    currentKanji: string;
}

export function VocabSentencesCard({ vocabId, currentKanji }: VocabSentencesCardProps) {
    const navigate = useNavigate();
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [vocabMap, setVocabMap] = useState<Record<string, Vocabulary>>({});
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

    // 2. Load Referenced Vocabulary
    useEffect(() => {
        if (sentences.length === 0) return;

        let mounted = true;
        const allIds = Array.from(new Set(sentences.flatMap(s => s.vocabIds)));

        // Filter out IDs we already have or current ID (though we might want to check its form)
        // Actually, we generally have the current vocab from parent, but let's grab all to be safe for consistency

        Promise.all(allIds.map(id => VocabularyService.loadVocab(id)))
            .then(vocabs => {
                if (mounted) {
                    const newMap: Record<string, Vocabulary> = {};
                    vocabs.forEach(v => {
                        newMap[v.id] = v;
                    });
                    setVocabMap(newMap);
                }
            })
            .catch(err => console.error("Failed to load referenced vocabs", err));

        return () => { mounted = false; };
    }, [sentences]);

    // 3. Helper to Tokenize/Highlight
    const renderSentence = (sentence: Sentence) => {
        const text = sentence.original;

        // Build matchers: { text, id, isCurrent }
        // Sort by length desc
        const matchers = Object.values(vocabMap)
            .filter(v => sentence.vocabIds.includes(v.id))
            .map(v => ({
                text: v.writtenForm.kanji,
                id: v.id,
                isCurrent: v.id === vocabId
            }))
            .sort((a, b) => b.text.length - a.text.length);

        // If currentKanji is not covered by vocabMap (e.g. wasn't in list or failed load), ensure we try to match it
        // Check if current is already in matchers
        if (!matchers.find(m => m.id === vocabId)) {
            matchers.push({ text: currentKanji, id: vocabId, isCurrent: true });
            matchers.sort((a, b) => b.text.length - a.text.length);
        }

        const nodes: React.ReactNode[] = [];
        let i = 0;

        while (i < text.length) {
            let matched = false;

            // Try to match any vocab at current position
            for (const matcher of matchers) {
                if (text.startsWith(matcher.text, i)) {
                    const key = `${matcher.id}-${i}`;
                    if (matcher.isCurrent) {
                        // Highlight
                        nodes.push(
                            <span key={key} className="text-primary font-bold bg-accent/10 px-0.5 rounded mx-0.5">
                                {matcher.text}
                            </span>
                        );
                    } else {
                        // Link
                        nodes.push(
                            <span
                                key={key}
                                onClick={() => navigate(`/vocab/${matcher.id}`)}
                                className="text-accent hover:underline cursor-pointer font-bold mx-0.5"
                            >
                                {matcher.text}
                            </span>
                        );
                    }
                    i += matcher.text.length;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                nodes.push(text[i]);
                i++;
            }
        }

        return <span className="font-mincho">{nodes}</span>;
    };

    if (loading) {
        // Checking "sentences.length" won't show loading state correctly on first load if strictly "loading"
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
                            {renderSentence(sentence)}
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
