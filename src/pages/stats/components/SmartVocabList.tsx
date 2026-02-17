import { useState, useEffect, useMemo } from "react";
import type { VocabProgress, Vocabulary } from "../../../models/vocabulary.model";
import { VocabularyService } from "../../../services/vocabulary.service";
import { VocabCard } from "../../../components/VocabCard";
import { VocabCardSkeleton } from "../../../components/VocabCardLoader";
import { Search, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface SmartVocabListProps {
    progress: VocabProgress[];
    onVocabClick?: (vocabId: string) => void;
}

type SortField = 'added_date' | 'srs_stage' | 'next_review' | 'failures' | 'kanji_rank';
type SortDirection = 'asc' | 'desc';

interface EnrichedVocab {
    vocab: Vocabulary;
    progress: VocabProgress;
}

export function SmartVocabList({ progress, onVocabClick }: SmartVocabListProps) {
    const [data, setData] = useState<EnrichedVocab[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>('added_date');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    // Batch load vocabulary with concurrency limit
    useEffect(() => {
        let isCancelled = false;
        const loadAll = async () => {
            const results: EnrichedVocab[] = [];
            const ids = progress.map(p => p.vocabId);
            const total = ids.length;

            if (total === 0) {
                setIsLoading(false);
                return;
            }

            // Simple batching to avoid clogging network/main thread
            const BATCH_SIZE = 20;
            for (let i = 0; i < total; i += BATCH_SIZE) {
                if (isCancelled) return;

                const batchIds = ids.slice(i, i + BATCH_SIZE);
                const promises = batchIds.map(async (id) => {
                    // Try to map progress to vocab
                    const p = progress.find(px => px.vocabId === id)!;
                    try {
                        const v = await VocabularyService.loadVocab(id);
                        if (v) return { vocab: v, progress: p };
                    } catch (e) {
                        console.error(`Failed to load vocab ${id}`, e);
                    }
                    return null;
                });

                const batchResults = await Promise.all(promises);
                batchResults.forEach(r => {
                    if (r) results.push(r);
                });

                setLoadingProgress(Math.round(((i + BATCH_SIZE) / total) * 100));

                // Small yield to UI
                await new Promise(r => setTimeout(r, 0));
            }

            if (!isCancelled) {
                setData(results);
                setIsLoading(false);
            }
        };

        loadAll();

        return () => { isCancelled = true; };
    }, [progress]);

    // Filtering & Sorting
    const processedData = useMemo(() => {
        let d = [...data];

        // 1. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            d = d.filter(item => {
                const v = item.vocab;
                return (
                    v.writtenForm.kanji.includes(q) ||
                    v.reading.primary.includes(q) ||
                    v.senses.some(s => s.glosses.some(g => g.toLowerCase().includes(q)))
                );
            });
        }

        // 2. Sort
        d.sort((a, b) => {
            let valA: any = 0;
            let valB: any = 0;

            switch (sortField) {
                case 'added_date':
                    valA = a.progress.introductionAt ? new Date(a.progress.introductionAt).getTime() : 0;
                    valB = b.progress.introductionAt ? new Date(b.progress.introductionAt).getTime() : 0;
                    break;
                case 'next_review':
                    // Null next review (mastered/new) should be pushed to end usually, or treat as far future?
                    valA = a.progress.nextReviewAt ? new Date(a.progress.nextReviewAt).getTime() : 9999999999999;
                    valB = b.progress.nextReviewAt ? new Date(b.progress.nextReviewAt).getTime() : 9999999999999;
                    break;
                case 'srs_stage':
                    // graduated > learning
                    valA = a.progress.stage === 'graduated' ? 1 : 0;
                    valB = b.progress.stage === 'graduated' ? 1 : 0;
                    break;
                case 'failures':
                    valA = (a.progress.reading?.history?.filter(h => h.result === 'wrong').length || 0) +
                        (a.progress.meaning?.history?.filter(h => h.result === 'wrong').length || 0);
                    valB = (b.progress.reading?.history?.filter(h => h.result === 'wrong').length || 0) +
                        (b.progress.meaning?.history?.filter(h => h.result === 'wrong').length || 0);
                    break;
                case 'kanji_rank':
                    valA = a.vocab.frequency?.kanjiRank || 99999;
                    valB = b.vocab.frequency?.kanjiRank || 99999;
                    break;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return d;
    }, [data, searchQuery, sortField, sortDir]);

    // Pagination? Let's just limit render for now or use simple pagination if list is huge.
    // For < 500 items, render all is fine. For 2000, maybe slow.
    // Let's implement simple pagination.
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 30;
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const displayedItems = processedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [searchQuery, sortField, sortDir]);


    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 animate-fade-in">
                {/* Skeleton Controls */}
                <div className="flex flex-col md:flex-row gap-4 p-4 bg-surface rounded-lg shadow-sm border border-divider items-center justify-between opacity-50 pointer-events-none">
                    <div className="w-full md:w-64 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="w-32 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    </div>
                </div>

                {/* Skeleton Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <VocabCardSkeleton key={i} />
                    ))}
                </div>

                {/* Loading Progress Bar - Optional but helpful if batching takes time */}
                <div className="fixed bottom-4 right-4 bg-surface border border-divider shadow-md rounded-full px-4 py-2 flex items-center gap-3 z-50">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-primary font-medium">Loading... {loadingProgress}%</span>
                </div>
            </div>
        );
    }

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
                {displayedItems.map(({ vocab, progress }) => (
                    <VocabCard
                        key={vocab.id}
                        vocab={vocab}
                        progress={progress}
                        onClick={() => onVocabClick?.(vocab.id)}
                    />
                ))}
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
