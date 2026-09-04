import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useKanjiForm } from "../context/KanjiForm/useKanjiForm";
import type { KanjiLearningMethod } from "../models/user.model";
import { findKanjiMatch } from "../utils/kanjiSearch.utils";

const ROW_SIZE = 10;

/**
 * The grid is labelled by the order it is laid out in, not by a hardcoded
 * "KKLC" - more orders (RTK, JLPT) are expected, and only this label plus the
 * loaded list changes when one arrives.
 */
const ORDER_LABELS: Record<KanjiLearningMethod, string> = {
    kklc: 'KKLC order',
    rtk: 'RTK order',
    jlpt: 'JLPT order',
    custom: 'custom order',
};

interface KanjiKnowledgeGridProps {
    allKanji: string[];
    method: KanjiLearningMethod;
}

export function KanjiKnowledgeGrid({ allKanji, method }: KanjiKnowledgeGridProps) {
    const { state, toggleKanji } = useKanjiForm();
    const [query, setQuery] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const match = useMemo(() => findKanjiMatch(allKanji, query), [allKanji, query]);
    const hasQuery = query.trim() !== '';

    const rows = useMemo(() => {
        const chunks: string[][] = [];
        for (let i = 0; i < allKanji.length; i += ROW_SIZE) {
            chunks.push(allKanji.slice(i, i + ROW_SIZE));
        }
        return chunks;
    }, [allKanji]);

    // Scroll the match into view within the pane only. scrollIntoView would also
    // scroll the page itself, yanking the whole profile view while the user is
    // still typing in the search box.
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || !match) return;

        const target = container.querySelector<HTMLElement>(`[data-kanji-pos="${match.index}"]`);
        if (!target) return;

        container.scrollTo({
            top: Math.max(0, target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2),
            behavior: 'smooth',
        });
    }, [match]);

    const knownCount = state.knownKanji.size;
    const matchIsKnown = match ? state.knownKanji.has(match.kanji) : false;

    return (
        <div className="w-full mt-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-xs uppercase tracking-wide text-secondary font-gothic text-[0.6875rem]">
                    Known kanji ({ORDER_LABELS[method]})
                </div>
                <div className="text-xs text-tertiary font-gothic tabular-nums">
                    {knownCount} known of {allKanji.length}
                </div>
            </div>

            <div className="relative mb-3">
                <Search
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Find a kanji or a position (語 or 1240)"
                    aria-label="Find a kanji or a position"
                    className="w-full h-10 pl-9 pr-9 border rounded-md border-divider bg-surface text-primary font-gothic text-sm placeholder:text-input-placeholder"
                />
                {hasQuery && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-tertiary hover:text-primary cursor-pointer"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            {hasQuery && (
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-gothic">
                    {match ? (
                        <>
                            <span className="font-mincho text-xl text-primary">{match.kanji}</span>
                            <span className="text-tertiary tabular-nums">#{match.index + 1}</span>
                            <span className={matchIsKnown ? "text-accent" : "text-tertiary"}>
                                {matchIsKnown ? 'Known' : 'Not known yet'}
                            </span>
                            <button
                                type="button"
                                onClick={() => toggleKanji(match.kanji)}
                                className="text-xs px-2 py-1 rounded-md border border-divider bg-surface text-secondary hover:bg-surface-hover hover:text-primary cursor-pointer"
                            >
                                {matchIsKnown ? 'Mark as unknown' : 'Mark as known'}
                            </button>
                        </>
                    ) : (
                        <span className="text-tertiary">Not in this list</span>
                    )}
                </div>
            )}

            <div
                ref={scrollRef}
                className="relative max-h-[24rem] sm:max-h-[30rem] overflow-y-auto py-3 scrollbar-subtle"
                style={{
                    maskImage:
                        'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
                }}
            >
                <div className="flex flex-col gap-1.5">
                    {rows.map((row, rowIndex) => (
                        <div
                            key={rowIndex}
                            className="grid items-center justify-center gap-1.5"
                            /* Square-ish tiles that shrink on narrow screens rather than
                               stretching into wide rectangles on a full-width page. */
                            style={{ gridTemplateColumns: `2.75rem repeat(${ROW_SIZE}, minmax(0, 2.75rem))` }}
                        >
                            {/*
                                Position gutter: makes "the kanji around 1240" findable by eye,
                                without going through the search box.
                            */}
                            <div className="text-[0.625rem] text-tertiary/70 font-gothic tabular-nums text-right pr-1 select-none">
                                {rowIndex * ROW_SIZE + 1}
                            </div>

                            {row.map((kanji, columnIndex) => {
                                const position = rowIndex * ROW_SIZE + columnIndex;
                                const isKnown = state.knownKanji.has(kanji);
                                const isMatch = match?.index === position;

                                return (
                                    <button
                                        key={`${kanji}-${position}`}
                                        type="button"
                                        data-kanji-pos={position}
                                        onClick={() => toggleKanji(kanji)}
                                        title={`#${position + 1} ${kanji} - ${isKnown ? 'known' : 'not known yet'}`}
                                        aria-pressed={isKnown}
                                        className={`
                                            h-11 w-full rounded-md font-mincho text-xl leading-none transition-colors cursor-pointer
                                            flex items-center justify-center
                                            ${isKnown
                                                ? "text-primary bg-feedback-background ring-1 ring-accent/25 hover:bg-surface-hover"
                                                : "text-tertiary/70 bg-transparent hover:bg-surface-hover hover:text-secondary"
                                            }
                                            ${isMatch ? "ring-2 ring-accent" : ""}
                                        `.trim().replace(/\s+/g, ' ')}
                                    >
                                        {kanji}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-3 text-xs text-secondary font-serif">
                Known kanji are softly highlighted. Click any one to mark it known or unknown.
            </div>
        </div>
    );
}
