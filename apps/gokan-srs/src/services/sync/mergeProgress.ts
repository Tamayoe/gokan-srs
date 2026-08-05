import type { ReviewLog, SRSEntry, VocabProgress } from '../../models/vocabulary.model';
import type { UserSettings } from '../../models/user.model';
import type { GrammarProgress } from '../../models/grammar.model';
import { isVocabFullyMastered, vocabNextReviewAt } from '../scheduling';
import { isGrammarFullyMastered, grammarNextReviewAt } from '../grammarScheduling';
import type { ProgressWithMetadata } from './types';

/**
 * Pure merge logic for reconciling two devices' progress. Assumes both inputs
 * have already been through progressSerialization's hydrateProgress, so all
 * date fields are real Date instances (never ISO strings) - this is what lets
 * every comparison below be a simple getTime() rather than a defensive
 * new Date(maybeString ?? maybeDate).
 */

function toTime(date: Date | null): number {
    return date ? date.getTime() : 0;
}

/**
 * Merges two SRSEntry snapshots for the same reading/meaning slot. Recency
 * (which side reviewed it more recently) decides the scheduling-relevant
 * fields (dueDate, difficulty, lastReviewedAt); memoryStrength/interval are
 * taken as the max of both sides as a safety net so a merge can never regress
 * progress even if the "more recent" side is otherwise behind. History is a
 * full union, deduped by timestamp.
 */
export function mergeEntry(local: SRSEntry, remote: SRSEntry): SRSEntry {
    const winner = toTime(remote.lastReviewedAt) > toTime(local.lastReviewedAt) ? remote : local;

    const historyByDate = new Map<number, ReviewLog>();
    for (const log of local.history) historyByDate.set(log.date, log);
    for (const log of remote.history) historyByDate.set(log.date, log);
    const mergedHistory = Array.from(historyByDate.values())
        .sort((a, b) => a.date - b.date)
        .slice(-20);

    return {
        ...winner,
        memoryStrength: Math.max(local.memoryStrength, remote.memoryStrength),
        interval: Math.max(local.interval, remote.interval),
        history: mergedHistory,
    };
}

function pickEarliestDate(a: Date | null, b: Date | null): Date | null {
    if (!a) return b;
    if (!b) return a;
    return a < b ? a : b;
}

/**
 * Merges two VocabProgress records for the same vocabId, one field-group at a
 * time (reading and meaning merge independently), so a device that only
 * reviewed reading can never clobber another device's meaning review (and
 * vice versa). Stage/nextReviewAt are always re-derived via scheduling.ts
 * rather than merged directly, guaranteeing the result is internally
 * consistent regardless of what either input side had.
 */
export function mergeVocabProgress(
    local: VocabProgress,
    remote: VocabProgress,
    settings?: Pick<UserSettings, 'enableMeaningQuiz'>
): VocabProgress {
    const mergedReading = mergeEntry(local.reading, remote.reading);
    const mergedMeaning = mergeEntry(local.meaning, remote.meaning);

    const localRecency = Math.max(toTime(local.reading.lastReviewedAt), toTime(local.meaning.lastReviewedAt));
    const remoteRecency = Math.max(toTime(remote.reading.lastReviewedAt), toTime(remote.meaning.lastReviewedAt));
    const recencyWinner = remoteRecency > localRecency ? remote : local;

    const mergedNeedsRetryFlags = {
        reading: !!(local.needsRetry?.reading || remote.needsRetry?.reading),
        meaning: !!(local.needsRetry?.meaning || remote.needsRetry?.meaning),
    };
    const needsRetry = (mergedNeedsRetryFlags.reading || mergedNeedsRetryFlags.meaning) ? mergedNeedsRetryFlags : undefined;

    const merged: VocabProgress = {
        vocabId: local.vocabId,
        stage: 'learning',
        introductionAt: pickEarliestDate(local.introductionAt, remote.introductionAt),
        lastReviewedAt: recencyWinner.lastReviewedAt,
        totalReviews: Math.max(local.totalReviews, remote.totalReviews),
        consecutiveFailures: recencyWinner.consecutiveFailures,
        reading: mergedReading,
        meaning: mergedMeaning,
        needsRetry,
        nextReviewAt: null,
    };

    // Stage/nextReviewAt are always re-derived (never merged directly): graduated
    // if either side already was, OR if the merged entries now clear mastery
    // (e.g. reading alone, when meaning quizzes are disabled).
    const alreadyGraduated = local.stage === 'graduated' || remote.stage === 'graduated';
    merged.stage = (alreadyGraduated || isVocabFullyMastered(merged, settings)) ? 'graduated' : 'learning';
    merged.nextReviewAt = merged.stage === 'graduated' ? null : vocabNextReviewAt(merged, settings);
    return merged;
}

/**
 * Merges two learning queues by vocabId. Present-in-only-one-side items are
 * kept as-is (a pure union - no deletions), items present in both are merged
 * field-by-field via mergeVocabProgress.
 */
export function mergeLearningQueues(
    local: VocabProgress[],
    remote: VocabProgress[],
    settings?: Pick<UserSettings, 'enableMeaningQuiz'>
): VocabProgress[] {
    const localMap = new Map(local.map(item => [item.vocabId, item]));
    const remoteMap = new Map(remote.map(item => [item.vocabId, item]));
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    const merged: VocabProgress[] = [];
    for (const id of allIds) {
        const localItem = localMap.get(id);
        const remoteItem = remoteMap.get(id);

        if (localItem && remoteItem) {
            merged.push(mergeVocabProgress(localItem, remoteItem, settings));
        } else {
            merged.push((localItem ?? remoteItem)!);
        }
    }
    return merged;
}

/**
 * Grammar's equivalent of mergeVocabProgress. Simpler - a single SRSEntry
 * (reused via mergeEntry directly, no per-field-group split needed) and a
 * single needsRetry boolean instead of a per-quiz-type object.
 */
export function mergeGrammarProgress(local: GrammarProgress, remote: GrammarProgress): GrammarProgress {
    const mergedEntry = mergeEntry(local.entry, remote.entry);
    const recencyWinner = toTime(remote.lastReviewedAt) > toTime(local.lastReviewedAt) ? remote : local;

    const merged: GrammarProgress = {
        grammarId: local.grammarId,
        stage: 'learning',
        introductionAt: pickEarliestDate(local.introductionAt, remote.introductionAt),
        lastReviewedAt: recencyWinner.lastReviewedAt,
        totalReviews: Math.max(local.totalReviews, remote.totalReviews),
        consecutiveFailures: recencyWinner.consecutiveFailures,
        entry: mergedEntry,
        needsRetry: (local.needsRetry || remote.needsRetry) || undefined,
        nextReviewAt: null,
    };

    const alreadyGraduated = local.stage === 'graduated' || remote.stage === 'graduated';
    merged.stage = (alreadyGraduated || isGrammarFullyMastered(merged)) ? 'graduated' : 'learning';
    merged.nextReviewAt = merged.stage === 'graduated' ? null : grammarNextReviewAt(merged);
    return merged;
}

/** Pure union by grammarId, mirroring mergeLearningQueues. */
export function mergeGrammarQueues(local: GrammarProgress[], remote: GrammarProgress[]): GrammarProgress[] {
    const localMap = new Map(local.map(item => [item.grammarId, item]));
    const remoteMap = new Map(remote.map(item => [item.grammarId, item]));
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    const merged: GrammarProgress[] = [];
    for (const id of allIds) {
        const localItem = localMap.get(id);
        const remoteItem = remoteMap.get(id);

        if (localItem && remoteItem) {
            merged.push(mergeGrammarProgress(localItem, remoteItem));
        } else {
            merged.push((localItem ?? remoteItem)!);
        }
    }
    return merged;
}

export function mergeSettings(
    local: UserSettings,
    remote: UserSettings | null,
    localVersion: number,
    remoteVersion: number
): UserSettings {
    if (!remote) return local;
    return remoteVersion > localVersion ? remote : local;
}

/**
 * Top-level progress merge. Kanji knowledge uses last-version-wins (so
 * deletions from a newer device propagate); on a version tie, local wins to
 * preserve the active session's unpushed edits. Stats are field-wise max.
 * Always bumps the sync version counter.
 */
export function mergeProgress(
    local: ProgressWithMetadata | null,
    remote: ProgressWithMetadata | null,
    settings?: Pick<UserSettings, 'enableMeaningQuiz'>
): ProgressWithMetadata | null {
    if (!local && !remote) return null;
    if (!local) return addSyncMetadata(remote!);
    if (!remote) return addSyncMetadata(local);

    const localVersion = local._sync?.version ?? 0;
    const remoteVersion = remote._sync?.version ?? 0;

    const mergedKanjiKnowledge = remoteVersion > localVersion ? remote.kanjiKnowledge : local.kanjiKnowledge;
    const mergedQueue = mergeLearningQueues(local.learningQueue, remote.learningQueue, settings);
    const mergedGrammarQueue = mergeGrammarQueues(local.grammarQueue ?? [], remote.grammarQueue ?? []);

    return {
        ...local,
        stats: {
            totalReviews: Math.max(local.stats?.totalReviews ?? 0, remote.stats?.totalReviews ?? 0),
            totalLearned: Math.max(local.stats?.totalLearned ?? 0, remote.stats?.totalLearned ?? 0),
            newLearnedToday: Math.max(local.stats?.newLearnedToday ?? 0, remote.stats?.newLearnedToday ?? 0),
        },
        kanjiKnowledge: mergedKanjiKnowledge,
        learningQueue: mergedQueue,
        grammarQueue: mergedGrammarQueue,
        dailyOverride: local.dailyOverride || remote.dailyOverride,
        _sync: {
            lastModified: Date.now(),
            version: Math.max(localVersion, remoteVersion) + 1,
        },
    };
}

export function addSyncMetadata(progress: ProgressWithMetadata): ProgressWithMetadata {
    return {
        ...progress,
        _sync: {
            lastModified: Date.now(),
            version: (progress._sync?.version ?? 0) + 1,
        },
    };
}
