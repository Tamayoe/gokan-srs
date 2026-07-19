import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { KanjiKnowledge, UserProgress, UserSettings } from '../../models/user.model';
import type { Vocabulary } from '../../models/vocabulary.model';
import { StorageService } from '../../services/storage.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { SRSService } from '../../services/srs.service';
import type { AnswerResult } from '../../services/srs.service';
import { MigrationService } from '../../services/migration.service';
import { LLMService } from '../../services/llm.service';
import { CONSTANTS } from '../../commons/constants';
import { DEFAULT_SETTINGS } from '../../models/user.model';
import type { SetupValues } from '../../models/state.model';
import { calculateMasteryPercentage } from '../../utils/srs.utils';
import { mergeProgress, mergeSettings } from '../../services/sync/mergeProgress';
import type { ProgressWithMetadata } from '../../services/sync/types';
import { useGoogleDrive } from '../GoogleDriveContext';
import type { QuizState, QuizAction } from './quizReducer';
import { selectNextView, selectCurrentProgress } from './quizSelectors';
import { progressUploadSignature, stableStringify } from "../../services/progressSerialization";

export interface QuizActions {
    setupComplete(values: SetupValues): Promise<void>;
    setAnswer(answer: string): void;
    submitAnswer(): Promise<void>;
    advanceQueue({ now, overrideDailyLimit }: { now: Date, overrideDailyLimit?: boolean }): void;
    continueToNext(): Promise<void>;
    saveSettings(settings: UserSettings): void;
    updateKanjiKnowledge(knowledge: KanjiKnowledge): void;
    overrideDailyLimit(): Promise<void>;
    saveVocabIntroChoice(vocabulary: Vocabulary, choice: 'learn' | 'skip'): void;
    learnNextKanji(): Promise<void>;
    reset(): void;
}

/**
 * All side effects and business-logic actions for the quiz state machine:
 * vocab/sentence loading, auto-advance timing, daily reset, persistence,
 * migration triggering, and Drive sync wiring. QuizProvider stays a thin
 * assembler that just wires this hook's output into React context.
 */
export function useQuizOrchestration(state: QuizState, dispatch: Dispatch<QuizAction>) {
    const {
        logout,
        uploadProgress,
        isDownloading,
        lastDownloadTime,
        lastBackgroundMergeTime,
    } = useGoogleDrive();

    const startTimeRef = useRef<number | null>(null);
    // Latency captured at the moment the user SUBMITS their answer, not when they
    // later click Continue. Otherwise time spent reviewing the revealed correct
    // answer would inflate the latency and skew the SRS speed multiplier.
    const submitLatencyRef = useRef<number | null>(null);
    const dayBoundaryCheckedRef = useRef(false);
    const migrationTriggeredRef = useRef(false);

    const progressSignature = useMemo(() => progressUploadSignature(state.progress), [state.progress]);
    // Content signature for settings, for the same reason as progressSignature:
    // reconciles produce fresh (but content-identical) settings objects, and a raw
    // reference dependency would re-fire the auto-upload effect on every sync.
    const settingsSignature = useMemo(
        () => (state.settings ? stableStringify(state.settings) : null),
        [state.settings]
    );

    /* ---------- One-time startup checks ---------- */

    // Check day boundary using localStorage, exactly once when progress first loads.
    useEffect(() => {
        if (!state.progress || dayBoundaryCheckedRef.current) return;
        dayBoundaryCheckedRef.current = true;

        const lastAccessKey = 'GOKAN_LAST_ACCESS_DATE';
        const lastAccess = localStorage.getItem(lastAccessKey);
        const now = new Date();
        const today = now.toDateString();

        if (lastAccess !== today) {
            dispatch({ type: 'RESET_DAILY_STATS' });
            localStorage.setItem(lastAccessKey, today);
        }
    }, [state.progress]);

    // Run the async homograph-merge migration exactly once when progress first loads.
    useEffect(() => {
        if (!state.progress || migrationTriggeredRef.current) return;
        if (!MigrationService.needsMigration(state.progress)) return;
        migrationTriggeredRef.current = true;

        MigrationService.migrateMergedVocabsAsync(state.progress).then(updatedProgress => {
            if (updatedProgress !== state.progress) {
                dispatch({
                    type: 'SETUP_COMPLETE',
                    payload: { progress: updatedProgress, settings: state.settings! }
                });
                // Persist immediately so the version bump isn't dropped if the user
                // closes/refreshes before any learning action triggers a save.
                StorageService.saveProgress(updatedProgress);
            }
        }).catch(err => {
            console.error('[useQuizOrchestration] Async migration failed:', err);
        });
    }, [state.progress, state.settings]);

    /* ---------- Derived view ---------- */

    const [hasMoreLearnable, setHasMoreLearnable] = useState(false);

    useEffect(() => {
        if (!state.progress || !state.settings) return;
        SRSService.hasMoreLearnableVocabulary(state.progress, state.settings).then(setHasMoreLearnable);
    }, [state.progress, state.settings]);

    const nextView = useMemo(
        () => selectNextView(state, hasMoreLearnable),
        [state.progress, state.settings, state.introCandidates, state.currentVocab, state.nextKanjiToLearn, hasMoreLearnable]
    );

    const currentProgress = useMemo(() => selectCurrentProgress(state), [state.currentVocab, state.progress]);

    /* =========================
       ACTIONS
       ========================= */

    const actions: QuizActions = {
        async setupComplete({ kanjiKnowledge, settings }: SetupValues) {
            const progress: UserProgress = {
                kanjiKnowledge,
                learningQueue: [],
                stats: {
                    newLearnedToday: 0,
                    totalLearned: 0,
                    totalReviews: 0,
                },
                dailyOverride: false,
                adaptive: {
                    level: 1.0,
                    history: []
                }
            };

            dispatch({ type: 'SETUP_COMPLETE', payload: { progress, settings } });
        },

        setAnswer(answer) {
            dispatch({ type: 'SET_ANSWER', payload: answer });
        },

        async submitAnswer() {
            if (!state.currentVocab || state.feedback?.show || !state.currentQuizItem || state.isEvaluatingAi) return;

            // Freeze the answer latency here (start -> submit), before any AI
            // evaluation delay and before the user reviews the correct answer.
            submitLatencyRef.current = startTimeRef.current ? Date.now() - startTimeRef.current : null;

            const quizType = state.currentQuizItem.quizType;
            let result: AnswerResult;
            let matchedAnswer: string;
            let message = 'Incorrect.';

            if (quizType === 'reading') {
                const evaluation = SRSService.evaluateAnswer(state.userAnswer, state.currentVocab.reading);
                result = evaluation.result;
                matchedAnswer = evaluation.matchedAnswer;
            } else {
                const meanings = state.currentVocab.senses.flatMap(s => s.glosses);
                const evaluation = SRSService.evaluateMeaning(state.userAnswer, meanings);
                result = evaluation.result;
                matchedAnswer = evaluation.matchedAnswer;

                // Gemini API contextual validation, only when in 'context' mode and
                // the user has the feature enabled (enableGeminiContext is the Settings
                // master toggle - a leftover geminiApiKey from before the user disabled
                // it must not silently keep triggering AI calls).
                if (quizType === 'meaning' && state.currentQuizItem.quizMode === 'context' &&
                    state.settings?.enableGeminiContext &&
                    state.settings?.geminiApiKey &&
                    state.currentSentenceId &&
                    state.currentSentences &&
                    state.userAnswer.trim().length > 0) {

                    // If alwaysUseAiForMeaningContext is true, AI validates ALL answers, even strict-correct.
                    // If false, only strict-wrong/minor_error answers get AI-validated.
                    const shouldEvaluate = state.settings.alwaysUseAiForMeaningContext ||
                        (result === 'wrong' || result === 'minor_error');

                    if (shouldEvaluate) {
                        const sentence = state.currentSentences.find(s => s.id === state.currentSentenceId);

                        if (sentence) {
                            try {
                                dispatch({ type: 'EVALUATING_AI_START' });

                                const aiEvaluation = await LLMService.validateMeaningContext(
                                    state.settings.geminiApiKey,
                                    state.currentVocab,
                                    sentence,
                                    state.userAnswer
                                );

                                if (aiEvaluation.result === 'correct' || aiEvaluation.result === 'minor_error') {
                                    result = aiEvaluation.result;
                                    matchedAnswer = state.userAnswer;
                                    message = result === 'correct'
                                        ? `Correct. (AI Validated: ${aiEvaluation.reason})`
                                        : `Close. ${aiEvaluation.reason}`;
                                } else {
                                    result = 'wrong';
                                    if (aiEvaluation.reason) {
                                        message = `Incorrect. (AI: ${aiEvaluation.reason})`;
                                    }
                                }
                            } catch (e) {
                                console.error('[useQuizOrchestration] AI evaluation failed, falling back to strict result.', e);
                            }
                        }
                    }
                }
            }

            if (result === 'correct' && !message.includes('AI Validated')) message = 'Correct.';
            else if (result === 'minor_error' && !message.includes('Close.')) message = 'Close.';

            dispatch({ type: 'SUBMIT_ANSWER', payload: { type: result, message, matchedAnswer } });
        },

        async advanceQueue({ now }) {
            const updatedQueue = state.progress!.learningQueue;

            const nowDueCount = updatedQueue.filter(v => v.nextReviewAt && v.nextReviewAt <= now).length;
            const canAddNew = nowDueCount === 0 && nextView.sessionState !== 'waiting';
            const needsCandidates = canAddNew && state.introCandidates.length === 0;

            const newCandidates: Vocabulary[] = [];

            if (needsCandidates) {
                const currentCandidateIds = new Set(state.introCandidates.map(c => c.id));
                const maxToFind = CONSTANTS.srs.newVocabBatchSize - state.introCandidates.length;

                const candidateIds = await SRSService.getNextCandidates(
                    updatedQueue,
                    state.progress!.kanjiKnowledge,
                    state.settings!,
                    maxToFind,
                    currentCandidateIds
                );

                for (const id of candidateIds) {
                    try {
                        const vocab = await VocabularyService.loadVocab(id);
                        if (vocab) newCandidates.push(vocab);
                    } catch (e) {
                        console.error(`[useQuizOrchestration] Failed to load candidate ${id}`, e);
                    }
                }

                // Prevent an infinite loading loop if files are missing but listed in the index.
                if (candidateIds.length > 0 && newCandidates.length === 0) {
                    console.error('[useQuizOrchestration] CRITICAL: Found candidates in index, but ALL failed to load.', { candidateIds });
                    dispatch({
                        type: 'LOAD_VOCAB_ERROR',
                        payload: { vocabId: candidateIds[0], error: new Error('Candidate vocabulary files could not be loaded. Data might be corrupted or out-of-sync.') }
                    });
                    return;
                }
            }

            // If no candidates found, and we're not exhausted/blocked, prepare next kanji step.
            if (newCandidates.length === 0 && canAddNew && state.progress!.kanjiKnowledge.method === 'kklc') {
                try {
                    const kanjiIndex = await VocabularyService.loadKKLCKanjiIndex();
                    if (kanjiIndex) {
                        const nextStep = state.progress!.kanjiKnowledge.step + 1;
                        if (kanjiIndex[nextStep]) {
                            dispatch({ type: 'SET_NEXT_KANJI', payload: { step: nextStep, kanjis: kanjiIndex[nextStep] } });
                        }
                    }
                } catch (e) {
                    console.error('[useQuizOrchestration] Failed to load kanji index for next step', e);
                }
            } else if (newCandidates.length > 0 && state.nextKanjiToLearn) {
                dispatch({ type: 'SET_NEXT_KANJI', payload: null });
            }

            dispatch({
                type: 'ADVANCE_QUEUE',
                payload: {
                    progress: { ...state.progress!, learningQueue: updatedQueue },
                    candidates: newCandidates.length > 0 ? [...state.introCandidates, ...newCandidates] : undefined
                },
            });
        },

        async continueToNext() {
            if (!state.progress || !state.feedback || !state.currentVocab || !state.currentQuizItem) return;

            const now = new Date();
            const id = state.currentVocab.id;
            // Use the latency frozen at submit time, not the time up to this Continue
            // click (which would also count answer-review time).
            const latency = submitLatencyRef.current ?? 5000;

            const target = state.progress.learningQueue.find(v => v.vocabId === id);
            let historyItem = null;

            const currentAdaptive = state.progress.adaptive || { level: 1.0, history: [] };
            const newAdaptive = SRSService.updateAdaptiveStats(currentAdaptive, state.feedback.type);
            const adaptiveLevel = newAdaptive.level;

            const frequencySetting = state.settings!.learningFrequency;
            const frequencyModifier = CONSTANTS.srs.frequencyMultipliers[frequencySetting];
            const meaningQuizEnabled = state.settings?.enableMeaningQuiz !== false;

            // Apply the SRS update exactly once per answer, then reuse the single
            // result both for the mastery-delta history entry and the queue update.
            let updatedTarget: typeof target | null = null;

            if (target) {
                const { updated } = SRSService.applyAnswer(
                    target,
                    state.currentQuizItem.quizType,
                    state.currentQuizItem.quizMode,
                    state.userAnswer,
                    state.feedback.matchedAnswer,
                    latency,
                    now,
                    state.feedback.type,
                    adaptiveLevel,
                    frequencyModifier,
                    meaningQuizEnabled
                );
                updatedTarget = updated;

                const oldStrength = state.currentQuizItem.quizType === 'reading'
                    ? target.reading.memoryStrength
                    : target.meaning.memoryStrength;

                const newStrength = state.currentQuizItem.quizType === 'reading'
                    ? updated.reading.memoryStrength
                    : updated.meaning.memoryStrength;

                const delta = calculateMasteryPercentage(newStrength) - calculateMasteryPercentage(oldStrength);

                historyItem = {
                    vocabId: id,
                    writtenForm: state.currentVocab.writtenForm.kanji,
                    result: state.feedback.type,
                    delta
                };
            }

            const updatedQueue = state.progress.learningQueue.map(v =>
                v.vocabId === id && updatedTarget ? updatedTarget : v
            );

            dispatch({
                type: 'UPDATE_AFTER_ANSWER',
                payload: {
                    progress: {
                        ...state.progress,
                        learningQueue: updatedQueue,
                        stats: {
                            ...state.progress.stats,
                            totalReviews: state.progress.stats.totalReviews + 1,
                        },
                        adaptive: newAdaptive,
                    },
                    historyItem: historyItem!
                },
            });
        },

        saveSettings(settings) {
            dispatch({ type: 'SAVE_SETTINGS', payload: settings });
        },

        updateKanjiKnowledge(knowledge) {
            dispatch({ type: 'UPDATE_KANJI_KNOWLEDGE', payload: knowledge });
        },

        async overrideDailyLimit() {
            dispatch({ type: 'OVERRIDE_DAILY_LIMIT' });
        },

        async saveVocabIntroChoice(vocabulary, choice) {
            if (!state.progress) return;
            dispatch({ type: 'VOCAB_INTRO_CHOICE', choice, vocabId: vocabulary.id, vocabulary });
        },

        async learnNextKanji() {
            if (!state.progress || !state.nextKanjiToLearn) return;

            const newKanjiSet = new Set(state.progress.kanjiKnowledge.kanjiSet);
            state.nextKanjiToLearn.kanjis.forEach(k => newKanjiSet.add(k));

            const updatedProgress: UserProgress = {
                ...state.progress,
                kanjiKnowledge: {
                    ...state.progress.kanjiKnowledge,
                    step: state.nextKanjiToLearn.step,
                    kanjiSet: newKanjiSet
                }
            };

            dispatch({ type: 'LEARN_NEXT_KANJI', payload: updatedProgress });
        },

        reset() {
            StorageService.clearProgress();
            try {
                logout();
            } catch (e) {
                console.error('[useQuizOrchestration] Failed to logout during reset', e);
            }
            dispatch({ type: 'RESET' });
        },
    };

    /* ---------- Persistence ---------- */

    useEffect(() => {
        if (state.progress) StorageService.saveProgress(state.progress);
    }, [state.progress]);

    useEffect(() => {
        if (state.settings) StorageService.saveSettings(state.settings);
    }, [state.settings]);

    /* ---------- Auto-sync & reactivity ---------- */

    // Auto-upload: whenever progress or settings CONTENT changes, push to Drive in
    // the background. Deps are content signatures (not object references) so the
    // fresh-but-identical objects produced by each reconcile don't re-trigger it.
    useEffect(() => {
        if (!progressSignature || !state.progress || !state.settings || isDownloading) return;
        uploadProgress({ progress: state.progress, settings: state.settings }).catch(err => {
            console.error('[useQuizOrchestration] Auto-upload failed', err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progressSignature, settingsSignature, isDownloading, uploadProgress]);

    // React to a completed download: reload data when lastDownloadTime changes.
    useEffect(() => {
        if (!lastDownloadTime) return;

        const refreshedProgress = StorageService.loadProgress();
        const refreshedSettings = StorageService.loadSettings() ?? DEFAULT_SETTINGS;

        if (refreshedProgress) {
            setTimeout(() => {
                dispatch({
                    type: 'SETUP_COMPLETE',
                    payload: { progress: refreshedProgress, settings: refreshedSettings }
                });
            }, 0);
        }
    }, [lastDownloadTime]);

    // React to a background sync that PULLED IN REMOTE CHANGES (routine uploads of
    // local-only changes never bump lastBackgroundMergeTime - see GoogleDriveContext).
    // Reconcile (merge) those changes into live state rather than wholesale-replacing
    // it, so an in-flight answer submitted during the sync round-trip is never lost.
    useEffect(() => {
        if (!lastBackgroundMergeTime || !state.progress || !state.settings) return;

        const fromDisk = StorageService.loadProgress();
        const settingsFromDisk = StorageService.loadSettings() ?? DEFAULT_SETTINGS;
        if (!fromDisk) return;

        const liveVersion = (state.progress as ProgressWithMetadata)._sync?.version ?? 0;
        const diskVersion = (fromDisk as ProgressWithMetadata)._sync?.version ?? 0;

        // Nothing new landed on disk since we last reconciled - avoid a redundant dispatch.
        if (diskVersion <= liveVersion) return;

        const reconciledProgress = mergeProgress(
            state.progress as ProgressWithMetadata,
            fromDisk as ProgressWithMetadata,
            state.settings
        );
        const reconciledSettings = mergeSettings(state.settings, settingsFromDisk, liveVersion, diskVersion);

        if (!reconciledProgress) return;

        dispatch({ type: 'RECONCILE_REMOTE', payload: { progress: reconciledProgress, settings: reconciledSettings } });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastBackgroundMergeTime]);

    /* ---------- Load vocab ---------- */

    useEffect(() => {
        const queueItem = nextView.queueItem;

        if (!queueItem) {
            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: { vocab: null, sentences: null, selectedSentenceId: null } });

            if (state.progress && state.settings && (nextView.sessionState === 'learn' || nextView.sessionState === 'exhausted')) {
                actions.advanceQueue({ now: new Date() });
            }
            return;
        }

        dispatch({ type: 'LOAD_VOCAB_START', payload: queueItem });

        let alive = true;
        const vid = 'vocabId' in queueItem ? queueItem.vocabId : queueItem.vocab.vocabId;
        const quizType = queueItem.quizType;

        Promise.all([
            VocabularyService.loadVocab(vid),
            (quizType === 'meaning' && queueItem.quizMode === 'context') ? VocabularyService.loadSentences(vid) : Promise.resolve(null)
        ]).then(([vocab, sentences]) => {
            if (!alive) return;

            let selectedSentenceId: string | null = null;
            if (sentences && sentences.length > 0) {
                const idx = Math.floor(Math.random() * sentences.length);
                selectedSentenceId = sentences[idx].id;
            }

            dispatch({ type: 'LOAD_VOCAB_SUCCESS', payload: { vocab, sentences, selectedSentenceId } });
            startTimeRef.current = Date.now();
        }).catch(err => {
            if (!alive) return;
            console.error('[useQuizOrchestration] Failed to load vocab/sentences', err);
            dispatch({ type: 'LOAD_VOCAB_ERROR', payload: { vocabId: vid, error: err } });
        });

        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextView.queueItem, state.progress, state.settings, nextView.sessionState]);

    useEffect(() => {
        // Meaning quizzes have rich context (sentences) the user might want to read, so they don't auto-advance.
        if (state.feedback?.correct && state.currentQuizItem?.quizType !== 'meaning') {
            const timer = setTimeout(() => {
                actions.continueToNext().then();
            }, CONSTANTS.quiz.correctAnswerAutoAdvanceDelay);

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.feedback?.correct, state.currentQuizItem]);

    /* =========================
       COMPUTED FLAGS
       ========================= */

    const computed = {
        canSubmit:
            !!state.userAnswer.trim() &&
            !!state.currentVocab &&
            !state.feedback?.show &&
            !state.isLoadingVocab &&
            !state.isEvaluatingAi,

        canContinue: !!(state.feedback?.show && (!state.feedback.correct || state.currentQuizItem?.quizType === 'meaning')),

        isReady: !!state.currentVocab && !state.isLoadingVocab && !state.isEvaluatingAi,
    };

    return { actions, nextView, currentProgress, computed };
}
