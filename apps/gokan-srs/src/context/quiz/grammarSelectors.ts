import type { GrammarExample, GrammarPoint, GrammarProgress } from '../../models/grammar.model';
import type { UserProgress } from '../../models/user.model';
import type { SessionState } from '../../models/state.model';
import { isGrammarDue, grammarNextReviewAt } from '../../services/grammarScheduling';
import { VocabularyService } from '../../services/vocabulary.service';
import type { AnswerResult } from '../../services/srs.service';
import { SRSService } from '../../services/srs.service';
import { GrammarService } from '../../services/grammar.service';
import { hashString, pickStable } from '../../utils/deterministicPick';
import { computeSessionState } from './sessionState';
import { computeSessionStats, computeSessionPreview } from './sessionStats';
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

/** Grammar wrapper over the shared pickStable (utils/deterministicPick.ts): seeds on each point's per-review state so the pick reshuffles on a review or a retry flip. */
function pickStableGrammar(items: GrammarProgress[]): GrammarProgress | null {
    return pickStable(items, g => `${g.grammarId}:${g.totalReviews}:${g.needsRetry ? 1 : 0}`);
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

    const { sessionState, nextReviewAt } = computeSessionState<GrammarProgress, GrammarSessionState>(
        progress ? progress.grammarQueue : undefined,
        {
            isLearning: g => g.stage === 'learning',
            isDue: g => isGrammarDue(g, now) || !!g.needsRetry,
            nextReviewAtOf: g => grammarNextReviewAt(g),
            canLearn: hasMoreLearnableGrammar || grammarIntroCandidates.length > 0,
            states: { review: 'review', learn: 'learn', waiting: 'waiting', exhausted: 'exhausted' },
        }
    );

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
/**
 * Builds the drill plan for an `inflection` point - a point whose identity is a
 * derivation (て-form, causative, passive), so there is no invariant marker for
 * the cloze quiz to blank.
 *
 * Returns null when the dataset has no drill items for the point, which is
 * deliberate rather than defensive: `GrammarSRSService` keeps such a point out
 * of the introduction pipeline entirely, so reaching here without items would
 * mean serving an unanswerable card.
 *
 * The item is picked deterministically from the point's own list, seeded the
 * same way computeBlankPlan picks an example, so a recompute of the same turn is
 * stable while successive reviews cycle through different verbs.
 */
export async function computeConjugationPlan(point: GrammarPoint, reviewCount: number): Promise<GrammarBlankPlan | null> {
    const conjugations = await GrammarService.loadConjugations();
    const entry = conjugations[point.id];
    if (!entry || entry.items.length === 0) return null;

    const index = hashString(`${point.id}:${reviewCount}`) % entry.items.length;
    const item = entry.items[index];

    // Kana and kanji both accepted, plus whatever the dataset marked as an
    // equally correct alternative (書かされる for the causative-passive, the
    // colloquial 食べれる for the ichidan potential).
    const accepted = Array.from(new Set([item.target, item.targetReading, ...(item.alternatives ?? [])].filter(Boolean)));

    return {
        // No sentence is involved; 0 keeps the field well-formed for any consumer
        // that indexes examples without checking `conjugation` first.
        exampleIndex: 0,
        blankWordIndices: [0],
        // The derivation IS the point, so this blank decides the point's result.
        isPatternBlank: [true],
        acceptLists: [accepted],
        glosses: [entry.formLabel],
        readOnly: false,
        conjugation: {
            lemma: item.lemma,
            lemmaReading: item.lemmaReading,
            formLabel: entry.formLabel,
            wordClass: item.wordClass,
            target: item.target,
        },
    };
}

export async function computeBlankPlan(point: GrammarPoint, progress: UserProgress | null, reviewCount: number): Promise<GrammarBlankPlan | null> {
    // An inflection point cannot be tested by blanking a marker - hand it to the
    // conjugation drill. Falls through to the cloze path when the dataset has no
    // items, so a partially-built dataset degrades rather than breaking.
    if (point.kind === 'inflection') {
        const conjugationPlan = await computeConjugationPlan(point, reviewCount);
        if (conjugationPlan) return conjugationPlan;
    }

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
        const isPatternBlank = blankWordIndices.map(i => example.patternWordIndices.includes(i));

        const { acceptLists, glosses } = await buildBlankData(example, blankWordIndices);
        return { exampleIndex, blankWordIndices, isPatternBlank, acceptLists, glosses, readOnly: false };
    }

    // Pass 2: FALLBACK - pattern not locatable anywhere in this point; an example with a known word.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        const candidateIndices = candidateIndicesOf(example);
        if (candidateIndices.length === 0) continue;

        const knownIndices = candidateIndices.filter(i => isKnown(example.words[i].vocabId!));
        if (knownIndices.length > 0) {
            const { acceptLists, glosses } = await buildBlankData(example, knownIndices);
            // No pattern located, so none of these are pattern blanks - they grade as
            // pure vocab (worst-of), the original pre-pattern behaviour.
            return { exampleIndex, blankWordIndices: knownIndices, isPatternBlank: knownIndices.map(() => false), acceptLists, glosses, readOnly: false };
        }
    }

    // Pass 3: FALLBACK - no known vocab either; blank the single most frequent candidate.
    for (const exampleIndex of order) {
        const example = point.examples[exampleIndex];
        const candidateIndices = candidateIndicesOf(example);
        if (candidateIndices.length === 0) continue;

        const best = await pickMostFrequentCandidate(example, candidateIndices);
        const { acceptLists, glosses } = await buildBlankData(example, [best]);
        return { exampleIndex, blankWordIndices: [best], isPatternBlank: [false], acceptLists, glosses, readOnly: false };
    }

    // Pass 4: no example has any blankable word at all - read-only study material.
    return { exampleIndex: startIndex, blankWordIndices: [], isPatternBlank: [], acceptLists: [], glosses: [], readOnly: true };
}

/** Floor of the vocab coefficient: a grammar answer whose pattern is right but whose vocab blanks were ALL missed still earns this fraction of the full strength gain (never zero, never negative - the grammar core was demonstrated). */
export const GRAMMAR_VOCAB_COEFF_FLOOR = 0.5;

/** Worst-of across a set of per-blank results: wrong > pass > minor_error > correct. */
function worstOf(results: AnswerResult[]): AnswerResult {
    if (results.some(r => r === 'wrong')) return 'wrong';
    if (results.some(r => r === 'pass')) return 'pass';
    if (results.some(r => r === 'minor_error')) return 'minor_error';
    return 'correct';
}

/**
 * Vocab coefficient in [GRAMMAR_VOCAB_COEFF_FLOOR, 1] from the fraction of vocab
 * blanks answered correctly. No vocab blanks -> 1 (nothing to modulate).
 */
function vocabCoefficient(vocabResults: AnswerResult[]): number {
    if (vocabResults.length === 0) return 1;
    const successes = vocabResults.filter(r => r === 'correct' || r === 'minor_error').length;
    const ratio = successes / vocabResults.length;
    return GRAMMAR_VOCAB_COEFF_FLOOR + (1 - GRAMMAR_VOCAB_COEFF_FLOOR) * ratio;
}

export interface GrammarGradeResult {
    /** Same order as blankWordIndices - which specific blank(s) were wrong/passed. */
    perBlankResults: AnswerResult[];
    /** Same order as blankWordIndices - the accepted form each blank matched (or was revealed to, for a passed blank). */
    matchedAnswers: string[];
    /**
     * The grammar point's result. Decided by the pattern-marker blanks alone when
     * the plan has any (pattern wrong -> wrong; else the pattern's worst-of),
     * because there's one SRSEntry per point and it must mean grammar-point recall.
     * A missed vocab blank never turns a demonstrated grammar core into 'wrong'.
     * On the fallback examples with no located pattern, this falls back to
     * worst-of across every blank (the original vocab-only behaviour).
     */
    overall: AnswerResult;
    /**
     * Coefficient in [GRAMMAR_VOCAB_COEFF_FLOOR, 1] to scale the grammar point's
     * strength gain by, from how many vocab (non-pattern) blanks were right. 1.0
     * whenever the pattern wasn't a success (no gain to modulate) or there are no
     * vocab blanks.
     */
    strengthDeltaModifier: number;
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
 *
 * The grammar CONSTRUCTION is what this quiz tests, so the point's result is
 * driven by the pattern-marker blanks; vocab blanks are secondary reinforcement
 * and only modulate the *reward* (strengthDeltaModifier), never the pass/fail of
 * a demonstrated grammar core. See GrammarGradeResult.
 */
export function gradeGrammarAnswers(
    // isPatternBlank optional: a plan without it is treated as having no located
    // pattern (every blank vocab), which is the worst-of-all fallback path.
    blankPlan: Pick<GrammarBlankPlan, 'acceptLists'> & Partial<Pick<GrammarBlankPlan, 'isPatternBlank'>>,
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

    const isPattern = blankPlan.isPatternBlank ?? [];
    const hasPattern = perBlankResults.some((_, i) => isPattern[i]);

    let overall: AnswerResult;
    let strengthDeltaModifier = 1;

    if (hasPattern) {
        const patternResults = perBlankResults.filter((_, i) => isPattern[i]);
        const vocabResults = perBlankResults.filter((_, i) => !isPattern[i]);
        overall = worstOf(patternResults);
        // Only a successful grammar core has a positive gain to modulate.
        if (overall === 'correct' || overall === 'minor_error') {
            strengthDeltaModifier = vocabCoefficient(vocabResults);
        }
    } else {
        // No located pattern (fallback examples): every blank is vocab, so keep the
        // original worst-of-all behaviour at full strength.
        overall = worstOf(perBlankResults);
    }

    return { perBlankResults, matchedAnswers, overall, strengthDeltaModifier };
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
    if (!state.progress) {
        return { done: 0, total: 0, retriesPending: 0, waiting: 0, moreNew: hasMoreLearnableGrammar };
    }

    const byId = new Map(state.progress.grammarQueue.map(g => [g.grammarId, g]));

    const core = computeSessionStats({
        committed: state.grammarSession?.committed ?? [],
        actionable: collectActionableGrammarIds(state.progress.grammarQueue, now),
        isRetry: id => byId.get(id)?.needsRetry === true,
        // One key per point already, so the waiting count is just distinct ids.
        waitingCountOf: keys => new Set(keys).size,
    });

    return { ...core, moreNew: hasMoreLearnableGrammar };
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
    if (!state.progress) return { review: 0, new: 0, retries: 0 };

    return computeSessionPreview(state.progress.grammarQueue, {
        isGraduated: g => g.stage === 'graduated',
        isRetry: g => !!g.needsRetry,
        isNew: g => g.totalReviews === 0,
        isDue: g => isGrammarDue(g, now),
    });
}
