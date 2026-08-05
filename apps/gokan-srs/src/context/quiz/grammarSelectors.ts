import type { GrammarExample, GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import type { UserProgress } from '../../models/user.model';
import type { SessionState } from '../../models/state.model';
import { isGrammarDue, grammarNextReviewAt } from '../../services/grammarScheduling';
import { VocabularyService } from '../../services/vocabulary.service';
import type { AnswerResult } from '../../services/srs.service';
import { SRSService } from '../../services/srs.service';
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

function candidateIndicesOf(example: GrammarExample): number[] {
    const indices: number[] = [];
    example.words.forEach((w, i) => {
        if (w.vocabId !== null) indices.push(i);
    });
    return indices;
}

/**
 * Resolves the accept-list (surface, embedded reading, plus every writing
 * variant a full vocab fetch can offer) and the hint gloss for each blank in
 * `blankIndices`. Fetched once at load time (VocabularyService.loadVocab is
 * cached in-memory) so grading later stays synchronous. A failed fetch simply
 * falls back to surface+reading and an empty gloss rather than blocking the
 * card - the word is still gradable, just without the extra variants.
 */
async function buildBlankData(example: GrammarExample, blankIndices: number[]): Promise<{ acceptLists: string[][]; glosses: string[] }> {
    const acceptLists: string[][] = [];
    const glosses: string[] = [];

    for (const wordIndex of blankIndices) {
        const word = example.words[wordIndex];
        const forms = new Set<string>();
        forms.add(word.surface);
        if (word.reading) forms.add(word.reading);
        let gloss = '';

        if (word.vocabId) {
            try {
                const vocab = await VocabularyService.loadVocab(word.vocabId);
                forms.add(vocab.writtenForm.kanji);
                vocab.writtenForm.alternatives.forEach(a => forms.add(a));
                forms.add(vocab.reading.primary);
                vocab.reading.alternatives.forEach(a => forms.add(a));
                vocab.mergedVocabs?.forEach(m => forms.add(m.originalPrimaryReading));
                gloss = vocab.senses.flatMap(s => s.glosses)[0] ?? '';
            } catch (e) {
                console.error(`[grammarSelectors] Failed to load vocab ${word.vocabId} for blank ${wordIndex}, falling back to surface/reading only`, e);
            }
        }

        acceptLists.push(Array.from(forms));
        glosses.push(gloss);
    }

    return { acceptLists, glosses };
}

/** The single most-frequent (lowest frequency.kanjiRank) candidate word in an example, used for the one-blank fallback (item 5.2). Falls back to the first candidate if every fetch fails. */
async function pickMostFrequentCandidate(example: GrammarExample, candidateIndices: number[]): Promise<number> {
    let best = candidateIndices[0];
    let bestRank = Infinity;

    for (const i of candidateIndices) {
        const vocabId = example.words[i].vocabId;
        if (!vocabId) continue;
        try {
            const vocab = await VocabularyService.loadVocab(vocabId);
            if (vocab.frequency.kanjiRank < bestRank) {
                bestRank = vocab.frequency.kanjiRank;
                best = i;
            }
        } catch (e) {
            console.error(`[grammarSelectors] Failed to load vocab ${vocabId} while ranking candidates for the single-blank fallback`, e);
        }
    }

    return best;
}

/**
 * Picks the example sentence for the CURRENT review turn and decides which of
 * its words become blanks. Three passes, each preferred over the next:
 *
 * 1. Walk the examples starting from a deterministic pick (hashed on grammar
 *    point id + review count, so it varies across successive reviews of the
 *    same point without re-rolling on every recompute of the same turn,
 *    wrapping around all examples) and use the first one containing at least
 *    one word the user already knows (introduced in their vocab
 *    learningQueue) - blank every known word in it.
 * 2. If no example has a known word (a learner very early in vocab), use the
 *    first example (same walk order) that has ANY blankable word at all, and
 *    blank exactly the single most frequent one - a full blank-every-word
 *    fallback produced unanswerable cards for anyone without vocab overlap
 *    yet, and this word is the one most worth knowing.
 * 3. If literally no example in the whole point has a single word that
 *    resolved to a vocab id, there is nothing to grade - return a read-only
 *    plan (blankWordIndices: []) so the card renders as pure study material
 *    with no Submit step, rather than silently auto-granting SRS credit for
 *    an empty answer.
 */
export async function computeBlankPlan(point: GrammarPoint, progress: UserProgress | null, reviewCount: number): Promise<GrammarBlankPlan | null> {
    if (point.examples.length === 0) return null;

    const startIndex = hashString(`${point.id}:${reviewCount}`) % point.examples.length;
    const order = Array.from({ length: point.examples.length }, (_, i) => (startIndex + i) % point.examples.length);

    const isKnown = (vocabId: string): boolean => {
        if (!progress) return false;
        const vp = progress.learningQueue.find(v => v.vocabId === vocabId);
        return !!vp && vp.introductionAt !== null;
    };

    // Pass 1: an example with at least one known word.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        const candidateIndices = candidateIndicesOf(example);
        if (candidateIndices.length === 0) continue;

        const knownIndices = candidateIndices.filter(i => isKnown(example.words[i].vocabId!));
        if (knownIndices.length > 0) {
            const { acceptLists, glosses } = await buildBlankData(example, knownIndices);
            return { exampleIndex, blankWordIndices: knownIndices, acceptLists, glosses, readOnly: false };
        }
    }

    // Pass 2: no example has a known word - blank exactly the single most frequent candidate.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        const candidateIndices = candidateIndicesOf(example);
        if (candidateIndices.length === 0) continue;

        const best = await pickMostFrequentCandidate(example, candidateIndices);
        const { acceptLists, glosses } = await buildBlankData(example, [best]);
        return { exampleIndex, blankWordIndices: [best], acceptLists, glosses, readOnly: false };
    }

    // Pass 3: no example has any blankable word at all - read-only study material.
    return { exampleIndex: startIndex, blankWordIndices: [], acceptLists: [], glosses: [], readOnly: true };
}

export interface GrammarGradeResult {
    /** Same order as blankWordIndices - which specific blank(s) were wrong/passed. */
    perBlankResults: AnswerResult[];
    /** Same order as blankWordIndices - the accepted form each blank matched (or was revealed to, for a passed blank). */
    matchedAnswers: string[];
    /** Worst-of across every blank: wrong > pass > minor_error > correct. There's one SRSEntry per grammar point, not one per blank, so the whole exercise needs a single combined result. */
    overall: AnswerResult;
}

/**
 * Grades every blank in a submitted grammar answer against its accept-list
 * (built once at load time by computeBlankPlan, so this is pure and
 * synchronous - no vocab fetch here). A blank whose hint was revealed
 * (hintLevel >= 2) always grades as 'pass' regardless of what was typed,
 * since the user already gave up on it rather than answering.
 */
export function gradeGrammarAnswers(
    blankPlan: Pick<GrammarBlankPlan, 'acceptLists'>,
    answers: string[],
    hintLevels: number[]
): GrammarGradeResult {
    const perBlankResults: AnswerResult[] = [];
    const matchedAnswers: string[] = [];

    blankPlan.acceptLists.forEach((accepted, i) => {
        if ((hintLevels[i] ?? 0) >= 2) {
            perBlankResults.push('pass');
            matchedAnswers.push(accepted[0] ?? '');
            return;
        }

        const userInput = answers[i] ?? '';
        const { result, matchedAnswer } = SRSService.evaluateAnswer(userInput, {
            primary: accepted[0] ?? '',
            alternatives: accepted.slice(1),
        });
        perBlankResults.push(result);
        matchedAnswers.push(matchedAnswer);
    });

    let overall: AnswerResult = 'correct';
    if (perBlankResults.some(r => r === 'wrong')) overall = 'wrong';
    else if (perBlankResults.some(r => r === 'pass')) overall = 'pass';
    else if (perBlankResults.some(r => r === 'minor_error')) overall = 'minor_error';

    return { perBlankResults, matchedAnswers, overall };
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
