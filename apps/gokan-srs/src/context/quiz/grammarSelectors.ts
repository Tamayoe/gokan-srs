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
 * its words become blanks. The grammar CONSTRUCTION is the primary thing this
 * quiz tests, not vocabulary that happens to sit in the sentence - there is
 * one SRSEntry per grammar point, so what gets graded has to consistently
 * reflect grammar-point recall, or the schedule that entry drives doesn't
 * mean what it claims to. Four passes, each preferred over the next:
 *
 * 1. PRIMARY - an example whose grammar-pattern markers were located at
 *    dataset build time (`example.patternWordIndices`, non-empty - see
 *    docs/SCHEMA.md in gokan-dataset). Blank those markers unconditionally,
 *    regardless of vocab knowledge - this is what makes review of the point
 *    actually test the point. Examples are walked in a deterministic-but-
 *    varying order (hashed on grammar point id + review count) so repeated
 *    reviews of the same point cycle through different examples without
 *    re-rolling on every recompute of the same turn. Any OTHER content word
 *    in that same example the user already knows (introduced in
 *    learningQueue) is layered in as SECONDARY reinforcement - vocab recall
 *    stays part of the exercise, just never at the expense of the pattern.
 * 2. FALLBACK - the pattern isn't locatable in any of the point's examples
 *    (rare: ~1.9% of points as of the dataset's last build, all conjugation-
 *    transformation-style points with no literal marker in common across
 *    their own examples - see the gokan-dataset pattern-location issue).
 *    An example with at least one known word, blanking every known word in it
 *    - this is the ORIGINAL vocab-only behavior, demoted to a fallback for
 *    the residual the primary path can't cover.
 * 3. FALLBACK - no example has a known word either (a learner very early in
 *    vocab, on one of these rare pattern-less points): blank exactly the
 *    single most frequent candidate word, so there is still something to
 *    answer rather than an unanswerable all-blank card.
 * 4. No example has any blankable word at all - return a read-only plan
 *    (blankWordIndices: []) so the card renders as pure study material with
 *    no Submit step, rather than silently auto-granting SRS credit for an
 *    empty answer.
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

    // Pass 1: PRIMARY - an example whose grammar-pattern markers are located.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        if (example.patternWordIndices.length === 0) continue;

        const candidateIndices = candidateIndicesOf(example);
        const knownVocabIndices = candidateIndices.filter(
            i => !example.patternWordIndices.includes(i) && isKnown(example.words[i].vocabId!)
        );
        const blankWordIndices = [...example.patternWordIndices, ...knownVocabIndices].sort((a, b) => a - b);

        const { acceptLists, glosses } = await buildBlankData(example, blankWordIndices);
        return { exampleIndex, blankWordIndices, acceptLists, glosses, readOnly: false };
    }

    // Pass 2: FALLBACK - pattern not locatable anywhere in this point; an example with a known word.
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

    // Pass 3: FALLBACK - no known vocab either; blank the single most frequent candidate.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        const candidateIndices = candidateIndicesOf(example);
        if (candidateIndices.length === 0) continue;

        const best = await pickMostFrequentCandidate(example, candidateIndices);
        const { acceptLists, glosses } = await buildBlankData(example, [best]);
        return { exampleIndex, blankWordIndices: [best], acceptLists, glosses, readOnly: false };
    }

    // Pass 4: no example has any blankable word at all - read-only study material.
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
 * (hintLevel >= 2) always grades as 'minor_error' regardless of what was
 * typed - the user gave up on it rather than answering, but reading the
 * answer still leaves an impression, so it's graded less harshly than a
 * genuinely wrong guess (matching CONSTANTS.srs.formula.resultFactors:
 * minor_error +0.10 vs wrong -0.40).
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
            perBlankResults.push('minor_error');
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

/** Every grammar point actionable right now (due, or awaiting a retry), as grammar ids - grammar's equivalent of collectActionableTaskKeys. */
export function collectActionableGrammarIds(queue: GrammarProgress[], now: Date): string[] {
    return queue
        .filter(g => g.stage !== 'graduated' && (isGrammarDue(g, now) || g.needsRetry))
        .map(g => g.grammarId);
}

export interface GrammarSessionStats {
    /** Committed session points the user has cleared (answered, deferred, or graduated out). */
    done: number;
    /** Size of the committed session set - the stable progress denominator. */
    total: number;
    /** Committed points currently awaiting a retry (a wrong answer this session). */
    retriesPending: number;
    /** Grammar points due now that are NOT part of this session (came due mid-session). */
    waiting: number;
    /** True when brand-new grammar points can still be learned beyond this session. */
    moreNew: boolean;
}

/**
 * Grammar's equivalent of selectSessionStats - progress bookkeeping computed
 * against the session's frozen committed set rather than the live due count,
 * for the same reason vocab's counter needed one (see selectSessionStats's
 * doc comment). Simpler here: one task per grammar point, no reading/meaning
 * split, so there's no filterSessionCommit-style staggering to account for.
 */
export function selectGrammarSessionStats(
    state: Pick<QuizState, 'progress' | 'grammarSession'>,
    hasMoreLearnableGrammar: boolean,
    now: Date = new Date()
): GrammarSessionStats {
    const empty: GrammarSessionStats = { done: 0, total: 0, retriesPending: 0, waiting: 0, moreNew: hasMoreLearnableGrammar };
    if (!state.progress) return empty;

    const committed = new Set(state.grammarSession?.committed ?? []);
    const total = committed.size;

    const byId = new Map(state.progress.grammarQueue.map(g => [g.grammarId, g]));
    const actionable = new Set(collectActionableGrammarIds(state.progress.grammarQueue, now));

    let done = 0;
    let retriesPending = 0;
    for (const id of committed) {
        if (!actionable.has(id)) {
            done++;
            continue;
        }
        if (byId.get(id)?.needsRetry) retriesPending++;
    }

    const waiting = new Set<string>();
    for (const id of actionable) {
        if (!committed.has(id)) waiting.add(id);
    }

    return { done, total, retriesPending, waiting: waiting.size, moreNew: hasMoreLearnableGrammar };
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
