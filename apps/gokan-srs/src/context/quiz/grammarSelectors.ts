import type { GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import type { UserProgress } from '../../models/user.model';
import type { SessionState } from '../../models/state.model';
import { isGrammarDue, grammarNextReviewAt } from '../../services/grammarScheduling';
import type { QuizState } from './quizReducer';
import type { GrammarBlankPlan, PendingGrammarQuizItem } from './grammarReducer';

/** Grammar has no kanji-gated learning step, so 'learn-kanji' never applies here. */
export type GrammarSessionState = Exclude<SessionState, 'learn-kanji'>;

export interface GrammarNextViewResult {
    queueItem: PendingGrammarQuizItem | null;
    sessionState: GrammarSessionState;
    nextReviewAt: Date | null;
    shouldShowIntro: boolean;
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

/** Deterministic pick, mirroring srs.utils.ts's pickStable - same due pool always yields the same pick, reshuffling only when the pool's own state changes (a review, a retry flip). */
function pickStableGrammar(items: GrammarProgress[]): GrammarProgress | null {
    if (items.length === 0) return null;
    const seed = items.map(g => `${g.grammarId}:${g.totalReviews}:${g.needsRetry ? 1 : 0}`).join('|');
    return items[hashString(seed) % items.length];
}

/**
 * Grammar's equivalent of selectNextView - single source of truth for "what
 * should the grammar screen show right now". Intro candidates take priority
 * for queueItem (mirroring vocab); sessionState is computed independently.
 */
export function selectNextGrammarView(
    state: Pick<QuizState, 'progress' | 'grammarIntroCandidates' | 'currentGrammarPoint'>,
    hasMoreLearnableGrammar: boolean,
    now: Date = new Date()
): GrammarNextViewResult {
    const { progress, grammarIntroCandidates } = state;

    let queueItem: PendingGrammarQuizItem | null = null;
    if (grammarIntroCandidates.length > 0) {
        queueItem = { grammarId: grammarIntroCandidates[0].id };
    } else if (progress) {
        const dueOrRetry = progress.grammarQueue.filter(g =>
            g.stage !== 'graduated' && (isGrammarDue(g, now) || g.needsRetry)
        );
        const picked = pickStableGrammar(dueOrRetry);
        queueItem = picked ? { grammarId: picked.grammarId } : null;
    }

    let sessionState: GrammarSessionState = 'exhausted';
    let nextReviewAt: Date | null = null;

    if (progress) {
        const learning = progress.grammarQueue.filter(g => g.stage === 'learning');
        const due = learning.filter(g => isGrammarDue(g, now) || g.needsRetry);

        if (due.length > 0) {
            sessionState = 'review';
        } else {
            nextReviewAt = learning
                .map(g => grammarNextReviewAt(g))
                .filter((d): d is NonNullable<typeof d> => !!d)
                .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

            const canLearn = hasMoreLearnableGrammar || grammarIntroCandidates.length > 0;
            sessionState = canLearn
                ? 'learn'
                : learning.length > 0
                    ? 'waiting'
                    : 'exhausted';
        }
    }

    let shouldShowIntro = false;
    if (state.currentGrammarPoint && progress) {
        const gp = progress.grammarQueue.find(g => g.grammarId === state.currentGrammarPoint!.id);
        shouldShowIntro = !gp || !gp.introductionAt;
    }

    return { queueItem, sessionState, nextReviewAt, shouldShowIntro };
}

/**
 * Picks the example sentence for the CURRENT review turn (deterministic per
 * grammar point + review count, so it varies across successive reviews of the
 * same point without re-rolling on every recompute of the same turn) and
 * decides which of its words become blanks: every word resolved to a vocab id
 * the user already knows (introduced in their vocab learningQueue). If NONE of
 * the sentence's words are known yet (a learner very early in vocab, or a
 * sentence whose words are all still new to them), blank every content word
 * instead - the exercise then tests recall of the grammar construction itself
 * (using the `formation` template shown on screen) rather than being trivially
 * all pre-filled text with nothing left to answer.
 */
export function computeBlankPlan(point: GrammarPoint, progress: UserProgress | null, reviewCount: number): GrammarBlankPlan | null {
    if (point.examples.length === 0) return null;

    const exampleIndex = hashString(`${point.id}:${reviewCount}`) % point.examples.length;
    const example = point.examples[exampleIndex];

    const isKnown = (vocabId: string): boolean => {
        if (!progress) return false;
        const vp = progress.learningQueue.find(v => v.vocabId === vocabId);
        return !!vp && vp.introductionAt !== null;
    };

    const candidateIndices: number[] = [];
    example.words.forEach((w, i) => {
        if (w.vocabId !== null) candidateIndices.push(i);
    });

    const knownIndices = candidateIndices.filter(i => isKnown(example.words[i].vocabId!));
    const blankWordIndices = knownIndices.length > 0 ? knownIndices : candidateIndices;

    return { exampleIndex, blankWordIndices };
}

export function selectCurrentGrammarProgress(
    state: Pick<QuizState, 'currentGrammarPoint' | 'progress'>
): GrammarProgress | null {
    if (!state.currentGrammarPoint || !state.progress) return null;
    return state.progress.grammarQueue.find(g => g.grammarId === state.currentGrammarPoint!.id) ?? null;
}

export interface NextGrammarSessionPreview {
    review: number;
    new: number;
    retries: number;
}

/** Preview of the next grammar session's contents, mirroring selectNextSessionPreview - shown on the Main hub's grammar activity card. */
export function selectNextGrammarSessionPreview(
    state: Pick<QuizState, 'progress'>,
    now: Date = new Date()
): NextGrammarSessionPreview {
    const preview: NextGrammarSessionPreview = { review: 0, new: 0, retries: 0 };
    if (!state.progress) return preview;

    for (const g of state.progress.grammarQueue) {
        if (g.stage === 'graduated') continue;

        if (g.needsRetry) {
            preview.retries++;
        } else if (g.totalReviews === 0) {
            preview.new++;
        } else if (isGrammarDue(g, now)) {
            preview.review++;
        }
    }

    return preview;
}
