import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Animated } from "react-native";
import type { VocabProgress, Vocabulary } from "@gokan-srs/core/models/vocabulary.model";
import { VocabularyService } from "@gokan-srs/core/services/vocabulary.service";
import { VocabCard } from "../../../components/VocabCard";
import { VocabCardSkeleton } from "../../../components/VocabCardLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "../../../components/ui/Button";
import { styles, THEME } from "@gokan-srs/ui";

interface SmartVocabListProps {
    progress: VocabProgress[];
    onVocabClick?: (vocabId: string) => void;
}

type SortField = 'added_date' | 'srs_stage' | 'next_review' | 'failures' | 'kanji_rank';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortField, label: string }[] = [
    { value: 'added_date', label: 'Date Added' },
    { value: 'next_review', label: 'Next Review' },
    { value: 'srs_stage', label: 'SRS Stage' },
    { value: 'failures', label: 'Failure Count' },
    { value: 'kanji_rank', label: 'Frequency' },
];

export function SmartVocabList({ progress, onVocabClick }: SmartVocabListProps) {
    const [vocabCache, setVocabCache] = useState<Record<string, Vocabulary>>({});

    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>('added_date');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 30;

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

    const processedProgress = useMemo(() => {
        let pArray = [...progress];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            pArray = pArray.filter(p => {
                const v = vocabCache[p.vocabId];
                if (!v) return false;
                return (
                    v.writtenForm.kanji.includes(q) ||
                    v.reading.primary.includes(q) ||
                    v.senses.some(s => s.glosses.some(g => g.toLowerCase().includes(q)))
                );
            });
        }

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
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return pArray;
    }, [progress, searchQuery, sortField, sortDir, vocabCache, frequencyRanks]);

    const totalPages = Math.ceil(processedProgress.length / ITEMS_PER_PAGE) || 1;
    const displayedItems = processedProgress.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [searchQuery, sortField, sortDir]);

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

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [searchQuery, sortField, sortDir]);

    // Remove the full-screen skeleton block so the search input stays usable immediately,
    // and let the grid render individual VocabCardSkeletons instead.

    return (
        <View style={[styles.flexCol, styles.gap4]}>
            {/* Controls */}
            <View style={[styles.flexCol, styles.gap4, styles.p4, styles.bgSurface, styles.border, { borderRadius: 8, borderColor: THEME.colors.divider }]}>
                <View style={[styles.relative, styles.wFull]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={THEME.colors.tertiary} style={[styles.absolute, { top: 10, left: 12, zIndex: 1 }]} />
                    <TextInput
                        placeholder="Search reading, meaning..."
                        placeholderTextColor={THEME.colors.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={[styles.wFull, styles.border, styles.bgSurface, styles.textPrimary, { paddingLeft: 40, paddingRight: 12, paddingVertical: 8, borderRadius: 6, fontSize: 14, borderColor: THEME.colors.divider }]}
                    />
                </View>

                <View style={[styles.flexRow, styles.alignCenter, styles.justifyBetween, styles.gap2]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.flexRow, styles.gap2]}>
                        {SORT_OPTIONS.map(opt => (
                            <Pressable
                                key={opt.value}
                                onPress={() => setSortField(opt.value)}
                                style={({ pressed, hovered }: any) => [
                                    styles.px3,
                                    styles.py2,
                                    styles.border,
                                    { borderRadius: 6, borderColor: sortField === opt.value ? THEME.colors.accent : THEME.colors.divider, backgroundColor: sortField === opt.value ? THEME.colors.accent + '1A' : (pressed || hovered ? THEME.colors.surfaceHover : THEME.colors.surface) }
                                ] as any}
                            >
                                <Text style={[styles.textSm, { color: sortField === opt.value ? THEME.colors.accent : THEME.colors.primary }]}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <Pressable
                        onPress={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        style={({ pressed, hovered }: any) => [
                            styles.p2,
                            styles.border,
                            { borderRadius: 6, borderColor: THEME.colors.divider, backgroundColor: pressed || hovered ? THEME.colors.surfaceHover : THEME.colors.surface }
                        ] as any}
                    >
                        <MaterialCommunityIcons name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={20} color={THEME.colors.primary} />
                    </Pressable>
                </View>
            </View>

            {/* List */}
            <View style={[styles.flexRow, styles.flexWrap, styles.gap3]}>
                {displayedItems.map((p) => {
                    const vocab = vocabCache[p.vocabId];
                    if (!vocab) return (
                        <View key={p.vocabId} style={[{ width: '31%', minWidth: 280, flexGrow: 1 }]}>
                            <VocabCardSkeleton />
                        </View>
                    );
                    return (
                        <View key={vocab.id} style={[{ width: '31%', minWidth: 280, flexGrow: 1 }]}>
                            <VocabCard
                                vocab={vocab}
                                progress={p}
                                onClick={() => onVocabClick?.(vocab.id)}
                            />
                        </View>
                    );
                })}
                {displayedItems.length === 0 && (
                    <View style={[styles.wFull, styles.py12, styles.flexCenter]}>
                        <Text style={[styles.textCenter, styles.textTertiary]}>No vocabulary found.</Text>
                    </View>
                )}
            </View>

            {/* Pagination */}
            {totalPages > 1 && (
                <View style={[styles.flexRow, styles.justifyCenter, styles.alignCenter, styles.gap2, styles.mt4]}>
                    <Button
                        variant="ghost"
                        disabled={page === 1}
                        onPress={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <Text style={[styles.textSm, styles.textSecondary]}>
                        Page {page} of {totalPages}
                    </Text>
                    <Button
                        variant="ghost"
                        disabled={page === totalPages}
                        onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </View>
            )}
        </View>
    );
}
