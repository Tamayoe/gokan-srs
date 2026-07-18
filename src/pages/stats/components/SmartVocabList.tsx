import { useState, useEffect, useMemo, useRef } from "react";
import type { VocabProgress, Vocabulary } from "../../../models/vocabulary.model";
import { VocabularyService } from "../../../services/vocabulary.service";
import { VocabCard } from "../../../components/VocabCard";
import { VocabCardSkeleton } from "../../../components/VocabCardLoader";
import { Search, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { romajiToHiragana, looksLikeRomaji } from "../../../utils/romaji";

interface SmartVocabListProps {
    progress: VocabProgress[];
    onVocabClick?: (vocabId: string) => void;
}

type SortField = 'added_date' | 'srs_stage' | 'next_review' | 'failures' | 'kanji_rank' | 'reading_mastery' | 'meaning_mastery';
type SortDirection = 'asc' | 'desc';

// The list controls persist across navigation (e.g. into a vocab detail page and
// back) so the user returns to the same sort/filter/page they left.
const LIST_STATE_KEY = 'gokan_stats_vocablist_state';

interface PersistedListState {
    searchQuery: string;
    sortField: SortField;
    sortDir: SortDirection;
    page: number;
}

function loadPersistedState(): Partial<PersistedListState> {
    try {
        const raw = sessionStorage.getItem(LIST_STATE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function SmartVocabList({ progress, onVocabClick }: SmartVocabListProps) {
    const [vocabCache, setVocabCache] = useState<Record<string, Vocabulary>>({});

    const persisted = useRef(loadPersistedState()).current;
    const [searchQuery, setSearchQuery] = useState(persisted.searchQuery ?? "");
    const [sortField, setSortField] = useState<SortField>(persisted.sortField ?? 'added_date');
    const [sortDir, setSortDir] = useState<SortDirection>(persisted.sortDir ?? 'desc');

    const [page, setPage] = useState(persisted.page ?? 1);
    const ITEMS_PER_PAGE = 30;

    // Load frequency index for sorting by kanji rank on unloaded items
    const [frequencyRanks, setFrequencyRanks] = useState<Record<string, number>>({});
    useEffect(() => {
        let mounted = true;
        VocabularyService.loadFrequencyIndex().then(idx => {
            if (idx && mounted) {
                const ranks: Record<string, number> = {};
                idx.forEach((entry, i) => ranks[entry.id] = i);
                setFrequencyRanks(ranks);
            }
        });
        return () => { mounted = false; };
    }, []);

    // Filtering & Sorting
    const processedProgress = useMemo(() => {
        let pArray = [...progress];

        // 1. Search (matches kanji, reading, meaning; romaji is converted to kana
        //    so "nichi" matches にち)
        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            const kanaQuery = looksLikeRomaji(q) ? romajiToHiragana(q) : null;
            pArray = pArray.filter(p => {
                const v = vocabCache[p.vocabId];
                if (!v) return false;
                return (
                    v.writtenForm.kanji.includes(q) ||
                    v.reading.primary.includes(q) ||
                    (kanaQuery !== null && kanaQuery !== q && v.reading.primary.includes(kanaQuery)) ||
                    v.senses.some(s => s.glosses.some(g => g.toLowerCase().includes(q)))
                );
            });
        }

        // 2. Sort
        pArray.sort((a, b) => {
            let valA: number = 0;
            let valB: number = 0;

            switch (sortField) {
                case 'added_date':
                    valA = a.introductionAt ? new Date(a.introductionAt).getTime() : 0;
                    valB = b.introductionAt ? new Date(b.introductionAt).getTime() : 0;
                    break;
                case 'next_review':
                    valA = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : 9999999999999;
                    valB = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : 9999999999999;
                    break;
                case 'srs_stage':
                    valA = a.stage === 'graduated' ? 1 : 0;
                    valB = b.stage === 'graduated' ? 1 : 0;
                    break;
                case 'failures':
                    valA = (a.reading?.history?.filter(h => h.result === 'wrong').length || 0) +
                        (a.meaning?.history?.filter(h => h.result === 'wrong').length || 0);
                    valB = (b.reading?.history?.filter(h => h.result === 'wrong').length || 0) +
                        (b.meaning?.history?.filter(h => h.result === 'wrong').length || 0);
                    break;
                case 'kanji_rank':
                    valA = frequencyRanks[a.vocabId] ?? 99999;
                    valB = frequencyRanks[b.vocabId] ?? 99999;
                    break;
                case 'reading_mastery':
                    valA = a.reading?.memoryStrength ?? 0;
                    valB = b.reading?.memoryStrength ?? 0;
                    break;
                case 'meaning_mastery':
                    valA = a.meaning?.memoryStrength ?? 0;
                    valB = b.meaning?.memoryStrength ?? 0;
                    break;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return pArray;
    }, [progress, searchQuery, sortField, sortDir, vocabCache, frequencyRanks]);

    // Pagination
    const totalPages = Math.ceil(processedProgress.length / ITEMS_PER_PAGE) || 1;
    const displayedItems = processedProgress.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Reset page to 1 when the filter/sort changes - but NOT on the initial mount,
    // otherwise it would clobber the page restored from sessionStorage.
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        setPage(1);
    }, [searchQuery, sortField, sortDir]);

    // Persist the list controls so returning from a vocab detail page restores them.
    useEffect(() => {
        try {
            sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify({ searchQuery, sortField, sortDir, page }));
        } catch {
            // sessionStorage unavailable (private mode / quota) - non-fatal.
        }
    }, [searchQuery, sortField, sortDir, page]);

    // Fetch all Vocab JSON files at once so search filters instantly
    useEffect(() => {
        let isCancelled = false;

        const loadMissing = async () => {
            const missingIds = progress
                .map(p => p.vocabId)
                .filter(id => !vocabCache[id]);

            if (missingIds.length === 0) return;

            // Fetch in larger chunks or all at once to avoid overloading network? 
            // 2000 local JSONs usually resolve in ~50ms in Vite
            const promises = missingIds.map(id => VocabularyService.loadVocab(id).catch(e => {
                console.error(`Failed to load vocab ${id}`, e);
                return null;
            }));

            const results = await Promise.all(promises);

            if (!isCancelled) {
                setVocabCache(prev => {
                    const next = { ...prev };
                    let changed = false;
                    for (const v of results) {
                        if (v) {
                            next[v.id] = v;
                            changed = true;
                        }
                    }
                    return changed ? next : prev;
                });
            }
        };

        loadMissing();

        return () => { isCancelled = true; };
    }, [progress, vocabCache]);

    // Remove the full-screen skeleton block so the search input stays usable immediately,
    // and let the grid render individual VocabCardSkeletons instead.

    return (
        <div className="flex flex-col gap-4 animate-fade-in">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-surface rounded-lg shadow-sm border border-divider items-center justify-between">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" size={16} />
                    <input
                        type="text"
                        placeholder="Search reading, meaning..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-divider rounded-md text-sm bg-surface text-primary placeholder:text-input-placeholder focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                </div>

                <div className="flex gap-2 items-center w-full md:w-auto">
                    <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value as SortField)}
                        className="px-3 py-2 border border-divider rounded-md text-sm bg-surface text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent grow md:grow-0"
                    >
                        <option value="added_date">Date Added</option>
                        <option value="next_review">Next Review</option>
                        <option value="srs_stage">SRS Stage</option>
                        <option value="reading_mastery">Reading Advancement</option>
                        <option value="meaning_mastery">Meaning Advancement</option>
                        <option value="failures">Failure Count</option>
                        <option value="kanji_rank">Frequency</option>
                    </select>

                    <button
                        onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        className="p-2 border border-divider rounded-md text-primary hover:bg-surface-hover"
                        title={sortDir === 'asc' ? "Ascending" : "Descending"}
                    >
                        {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedItems.map((p) => {
                    const vocab = vocabCache[p.vocabId];
                    if (!vocab) return <VocabCardSkeleton key={p.vocabId} />;
                    return (
                        <VocabCard
                            key={vocab.id}
                            vocab={vocab}
                            progress={p}
                            onClick={() => onVocabClick?.(vocab.id)}
                        />
                    );
                })}
                {displayedItems.length === 0 && (
                    <div className="col-span-full py-12 text-center text-tertiary">
                        No vocabulary found.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="ghost"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center text-sm text-secondary">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
