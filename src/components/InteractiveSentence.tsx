import type { Sentence } from "../models/sentence.model";


interface InteractiveSentenceProps {
    sentence: Sentence;
    targetVocabId?: string; // The specific vocab we are currently studying/viewing
    onVocabClick?: (vocabId: string) => void;
    className?: string;
}

export function InteractiveSentence({
    sentence,
    targetVocabId,
    onVocabClick,
    className = ""
}: InteractiveSentenceProps) {
    const text = sentence.original;
    const matches = sentence.matches || {};

    // 1. Flatten matches into a list of segments
    // We need to handle potential overlaps, though our builder tries to avoid them.
    // If overlaps exist, we prioritize the one that starts earlier, or is longer.
    // For simplicity and speed, let's assume non-overlapping or just take valid ones.

    interface Segment {
        type: 'text' | 'match';
        content: string;
        vocabId?: string;
        start: number;
        end: number;
    }

    const sortedMatchKeys = Object.keys(matches).sort((a, b) => {
        const mA = matches[a];
        const mB = matches[b];
        return mA.start - mB.start;
    });

    const segments: Segment[] = [];
    let currentIndex = 0;

    for (const vocabId of sortedMatchKeys) {
        const match = matches[vocabId];

        // Skip if this match starts before current index (overlap handling: strict skip)
        if (match.start < currentIndex) continue;

        // Add pre-match text
        if (match.start > currentIndex) {
            segments.push({
                type: 'text',
                content: text.substring(currentIndex, match.start),
                start: currentIndex,
                end: match.start
            });
        }

        // Add match
        const end = match.start + match.length;
        segments.push({
            type: 'match',
            content: text.substring(match.start, end),
            vocabId: vocabId,
            start: match.start,
            end: end
        });

        currentIndex = end;
    }

    // Add remaining text
    if (currentIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.substring(currentIndex),
            start: currentIndex,
            end: text.length
        });
    }

    // 2. Render
    return (
        <span className={`font-mincho leading-relaxed break-words ${className}`}>
            {segments.map((segment, i) => {
                if (segment.type === 'text') {
                    return <span key={i}>{segment.content}</span>;
                }

                const isTarget = segment.vocabId === targetVocabId;
                const isClickable = !isTarget && onVocabClick;

                if (isTarget) {
                    return (
                        <span
                            key={i}
                            className="text-accent font-bold border-b-2 border-accent/30 mx-0.5 px-0.5"
                        >
                            {segment.content}
                        </span>
                    );
                }

                if (isClickable) {
                    return (
                        <span
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                onVocabClick?.(segment.vocabId!);
                            }}
                            className="cursor-pointer text-primary border-b border-dashed border-tertiary/50 hover:text-accent hover:border-accent transition-colors mx-0.5"
                            title="Click to view details"
                        >
                            {segment.content}
                        </span>
                    );
                }

                return <span key={i}>{segment.content}</span>;
            })}
        </span>
    );
}
