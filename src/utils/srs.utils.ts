import type { VocabProgress } from "../models/vocabulary.model";
import type { UserSettings } from "../models/user.model";
import { CONSTANTS } from "../commons/constants";
import { isMeaningQuizEnabled } from "../services/scheduling";

export type QuizType = 'reading' | 'meaning';
export type QuizMode = 'base' | 'context';

export interface QuizItem {
    vocab: VocabProgress;
    quizType: QuizType;
    quizMode: QuizMode;
}

/**
 * Return the next quiz item (vocab + type) that is ready to be studied now.
 * Implements prioritized flow (Successive Batches):
 * 1. Retries (High priority, immediate re-test)
 * 2. Due Readings (Batch 1)
 * 3. Due Meanings (Batch 2)
 * 4. New Intros (Batch 3, if allowed)
 * 5. First Reviews (Newly introduced, not yet tested)
 */
/**
 * Is this vocab's READING quiz actionable right now (first review, due review, or
 * a pending reading retry)? Single source of truth shared by queue selection and
 * the session-progress counter, so the two can never disagree about what counts
 * as "a quiz the user has to do now".
 */
export function isReadingActionable(v: VocabProgress, now: Date = new Date()): boolean {
    const isFirstReview =
        v.totalReviews === 0 &&
        v.introductionAt !== null &&
        v.nextReviewAt !== null &&
        v.nextReviewAt <= now &&
        v.stage !== 'graduated';

    const isDueReading =
        v.totalReviews > 0 &&
        v.reading.dueDate !== null &&
        v.reading.dueDate <= now;

    return isFirstReview || isDueReading || v.needsRetry?.reading === true;
}

/** Is this vocab's MEANING quiz actionable right now (due review or pending retry)?
 *  Always false when meaning quizzes are disabled in settings. */
export function isMeaningActionable(
    v: VocabProgress,
    settings: UserSettings | undefined,
    now: Date = new Date()
): boolean {
    if (!isMeaningQuizEnabled(settings)) return false;

    const isDueMeaning =
        v.totalReviews > 0 &&
        v.meaning.dueDate !== null &&
        v.meaning.dueDate <= now;

    return isDueMeaning || v.needsRetry?.meaning === true;
}

export function getNextVocabToStudy(
    queue?: VocabProgress[],
    settings?: UserSettings,
    now: Date = new Date()
): QuizItem | null {
    if (!queue || queue.length === 0) return null;

    // 1. Priority: ALL Readings (First Reviews + Due Readings + Retries)
    // We want to clear all reading quizzes before moving to meanings.
    const allReadings = queue.filter(v => isReadingActionable(v, now));

    if (allReadings.length > 0) {
        return { vocab: pickStable(allReadings)!, quizType: 'reading', quizMode: 'base' };
    }

    // 3. Priority: Due Meanings (IF ENABLED)
    if (isMeaningQuizEnabled(settings)) {
        const dueMeanings = queue.filter(v => isMeaningActionable(v, settings, now));
        if (dueMeanings.length > 0) {
            const vocab = pickStable(dueMeanings)!;
            const mastery = calculateMasteryPercentage(vocab.meaning.memoryStrength);
            // Resolve the configured threshold level (default 'normal' = 50%)
            const thresholdKey = settings?.meaningContextThreshold ?? 'normal';
            const masteryThreshold = CONSTANTS.srs.meaningContextThresholds[thresholdKey];
            const mode: QuizMode = mastery >= masteryThreshold ? 'context' : 'base';
            return { vocab, quizType: 'meaning', quizMode: mode };
        }
    }

    // 4. Priority: New Intros (not introduced yet)
    // When introducing, we start with Reading quiz? Or just distinct Intro card?
    // The intro card leads to a "Learn" choice, which sets nextReviewAt=NOW.
    // Then it falls into "First Reviews".
    const newIntros = queue.filter(v =>
        v.introductionAt === null &&
        v.stage !== 'graduated'
    );
    if (newIntros.length > 0) {
        // Intros are type-agnostic until "Learn" is clicked, but we need a type.
        // We default to 'reading' as the primary entry point.
        return { vocab: pickStable(newIntros)!, quizType: 'reading', quizMode: 'base' };
    }

    return null;
}



function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

/**
 * Deterministic "shuffled" pick: a pseudo-random choice seeded by the pool's
 * own state, so the same pool always yields the same pick. Randomizing which
 * due item comes next is intentional (prevents interference effects), but this
 * function runs inside selectNextView, which is recomputed on every state
 * change - a Math.random() pick returned a DIFFERENT card per recomputation,
 * and since loading that card changes state (currentVocab), each pick triggered
 * the next: a visible cascade of flashing cards until two consecutive rolls
 * happened to agree. The seed includes per-item review state, so every answer
 * (including retry-flag flips) naturally reshuffles the order.
 */
function pickStable(items: VocabProgress[]): VocabProgress | null {
    if (items.length === 0) return null;
    const seed = items
        .map(v => {
            const reviewedAt = v.lastReviewedAt instanceof Date ? v.lastReviewedAt.getTime() : 0;
            const retry = `${v.needsRetry?.reading ? 1 : 0}${v.needsRetry?.meaning ? 1 : 0}`;
            return `${v.vocabId}:${v.totalReviews}:${reviewedAt}:${retry}`;
        })
        .join('|');
    return items[hashString(seed) % items.length];
}

/**
 * The two-loop mastery curve: p1 is progress through the "learning" loop
 * (0 -> visualSoftCap), p2 is progress through the "refining" loop
 * (visualSoftCap -> maxMemoryStrength). Exposed separately so MasteryRing can
 * render its two rings without reimplementing this math - the single source
 * of truth for the mastery curve lives here.
 */
export function calculateMasteryLoops(strength: number): { p1: number; p2: number } {
    const sMin = CONSTANTS.srs.formula.minMemoryStrength;
    const sSoft = CONSTANTS.srs.formula.mastery.visualSoftCap;
    const sMax = CONSTANTS.srs.formula.mastery.maxMemoryStrength;

    if (strength <= sMin) return { p1: 0, p2: 0 };

    let p1 = 0;
    if (strength >= sSoft) {
        p1 = 100;
    } else {
        const numer = Math.log(strength / sMin);
        const denom = Math.log(sSoft / sMin);
        p1 = (numer / denom) * 100;
    }

    let p2 = 0;
    if (strength > sSoft) {
        const numer = Math.log(strength / sSoft);
        const denom = Math.log(sMax / sSoft);
        p2 = (numer / denom) * 100;
    }

    return {
        p1: Math.min(Math.max(p1, 0), 100),
        p2: Math.min(Math.max(p2, 0), 100),
    };
}

export function calculateMasteryPercentage(strength: number): number {
    const { p1, p2 } = calculateMasteryLoops(strength);
    return Math.min(Math.max(p1 + p2, 0), 200);
}