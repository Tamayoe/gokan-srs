import type { GrammarProgress } from "../models/grammar.model";
import { isEntryMastered } from "./scheduling";

/**
 * Grammar's equivalent of scheduling.ts - single source of truth for "when is
 * this grammar point due" and "is it mastered". Much simpler than vocab's
 * version since a GrammarProgress has exactly one SRSEntry (no reading/meaning
 * split to reconcile).
 */

export function isGrammarFullyMastered(progress: Pick<GrammarProgress, 'entry'>): boolean {
    return isEntryMastered(progress.entry);
}

export function grammarNextReviewAt(progress: Pick<GrammarProgress, 'entry'>): Date | null {
    return isGrammarFullyMastered(progress) ? null : progress.entry.dueDate;
}

/** True if the given grammar point has a review due now (never true for graduated items). */
export function isGrammarDue(
    progress: Pick<GrammarProgress, 'entry' | 'stage'>,
    now: Date = new Date()
): boolean {
    if (progress.stage === 'graduated') return false;
    const due = grammarNextReviewAt(progress);
    return due !== null && due <= now;
}
