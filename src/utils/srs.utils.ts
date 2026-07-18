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
export function getNextVocabToStudy(
    queue?: VocabProgress[],
    settings?: UserSettings,
    now: Date = new Date()
): QuizItem | null {
    if (!queue || queue.length === 0) return null;

    // 1. Priority: ALL Readings (First Reviews + Due Readings + Retries)
    // We want to clear all reading quizzes before moving to meanings.
    const allReadings = queue.filter(v => {
        // Condition A: First Review (newly learned)
        const isFirstReview =
            v.totalReviews === 0 &&
            v.introductionAt !== null &&
            v.nextReviewAt !== null &&
            v.nextReviewAt <= now &&
            v.stage !== 'graduated';

        // Condition B: Due Reading Review
        const isDueReading =
            v.totalReviews > 0 &&
            v.reading.dueDate !== null &&
            v.reading.dueDate <= now;

        return isFirstReview || isDueReading || v.needsRetry?.reading === true;
    });

    if (allReadings.length > 0) {
        return { vocab: pickRandom(allReadings)!, quizType: 'reading', quizMode: 'base' };
    }

    // 3. Priority: Due Meanings (IF ENABLED)
    if (isMeaningQuizEnabled(settings)) {
        const dueMeanings = queue.filter(v =>
            (v.totalReviews > 0 &&
                v.meaning.dueDate !== null &&
                v.meaning.dueDate <= now) ||
            v.needsRetry?.meaning === true
        );
        if (dueMeanings.length > 0) {
            const vocab = pickRandom(dueMeanings)!;
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
        return { vocab: pickRandom(newIntros)!, quizType: 'reading', quizMode: 'base' };
    }

    return null;
}



function pickRandom<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
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