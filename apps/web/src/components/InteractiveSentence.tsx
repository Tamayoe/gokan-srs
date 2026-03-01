import type { Sentence } from "@gokan-srs/core/models/sentence.model";

interface InteractiveSentenceProps {
    sentence: Sentence;
    targetVocabId?: string; // The specific vocab we are currently studying/viewing
    onVocabClick?: (vocabId: string) => void;
    className?: string;
    showFurigana?: boolean;
    allowTargetClickable?: boolean;
}

export function InteractiveSentence({
    sentence,
    targetVocabId,
    onVocabClick,
    className = "",
    showFurigana = false,
    allowTargetClickable = false
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
        reading?: string;
    }

    const flatMatches: { vocabId: string, start: number, length: number, reading?: string }[] = [];
    for (const vocabId in matches) {
        const matchArray = matches[vocabId];
        if (Array.isArray(matchArray)) {
            for (const m of matchArray) {
                flatMatches.push({ vocabId, ...m });
            }
        } else if (matchArray) {
            // Fallback for old data format
            flatMatches.push({ vocabId, ...(matchArray as any) });
        }
    }

    flatMatches.sort((a, b) => a.start - b.start);

    const segments: Segment[] = [];
    let currentIndex = 0;

    for (const match of flatMatches) {
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
            vocabId: match.vocabId,
            start: match.start,
            end: end,
            reading: match.reading
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
        <span className={`font-mincho leading-loose md:leading-relaxed break-words ${className}`}>
            {segments.map((segment, i) => {
                if (segment.type === 'text') {
                    return <span key={i}>{segment.content}</span>;
                }

                const isTarget = segment.vocabId === targetVocabId;
                const isClickable = onVocabClick && (!isTarget || allowTargetClickable);

                const rawReading = showFurigana && segment.type === 'match' ? segment.reading : null;
                const isKanaOnly = /^[\u3040-\u309F\u30A0-\u30FF]+$/.test(segment.content);
                const reading = rawReading && rawReading !== segment.content && !isKanaOnly ? rawReading : null;

                const renderContent = () => {
                    if (reading) {
                        return (
                            <ruby>
                                {segment.content}
                                <rt className="text-[0.6em] select-none opacity-80" style={{ transform: "translateY(-10%)" }}>{reading}</rt>
                            </ruby>
                        );
                    }
                    return segment.content;
                };

                if (isTarget) {
                    return (
                        <span
                            key={i}
                            onClick={isClickable ? (e) => {
                                e.stopPropagation();
                                onVocabClick?.(segment.vocabId!);
                            } : undefined}
                            className={`text-accent font-bold border-b-2 border-accent/30 mx-0.5 px-0.5 ${isClickable ? 'cursor-pointer hover:border-accent transition-colors' : ''}`}
                            title={isClickable ? "Click to view details" : undefined}
                        >
                            {renderContent()}
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
                            {renderContent()}
                        </span>
                    );
                }

                return <span key={i}>{renderContent()}</span>;
            })}
        </span>
    );
}
