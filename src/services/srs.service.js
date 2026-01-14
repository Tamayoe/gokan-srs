import { CONSTANTS } from '../commons/constants';
import { VocabularyService } from './vocabulary.service';
export class SRSService {
    /* =======================
       ANSWER APPLICATION
       ======================= */
    static applyAnswer(vocab, correct, now) {
        if (!correct) {
            return {
                updated: {
                    ...vocab,
                    consecutiveFailures: vocab.consecutiveFailures + 1,
                    mastery: Math.max(0, vocab.mastery - CONSTANTS.srs.mastery.failurePenalty),
                    nextReviewAt: new Date(now.getTime() + CONSTANTS.srs.scheduling.failureRetryDelayMs),
                    lastReviewedAt: now,
                    totalReviews: vocab.totalReviews + 1,
                },
            };
        }
        const newMastery = Math.min(100, vocab.mastery + CONSTANTS.srs.mastery.successGain);
        const intervalMs = this.computeNextInterval(newMastery);
        return {
            updated: {
                ...vocab,
                mastery: newMastery,
                consecutiveFailures: 0,
                nextReviewAt: newMastery === 100
                    ? null // mastered vocab no longer scheduled
                    : new Date(now.getTime() + intervalMs),
                lastReviewedAt: now,
                totalReviews: vocab.totalReviews + 1,
            },
        };
    }
    static computeNextInterval(mastery) {
        const { minIntervalMs, firstSuccessIntervalMs, maxIntervalMs, growthExponent, } = CONSTANTS.srs.scheduling;
        // Clamp mastery
        const m = Math.max(0, Math.min(100, mastery));
        // Normalize mastery to [0, 1]
        const x = m / 100;
        // Power curve (controls acceleration)
        const curved = Math.pow(x, growthExponent);
        // Interpolate between first success and max interval
        const intervalAfterFirst = firstSuccessIntervalMs *
            Math.pow(maxIntervalMs / firstSuccessIntervalMs, curved);
        // Blend early learning phase
        const earlyFactor = Math.min(1, m / 15);
        const interval = minIntervalMs * (1 - earlyFactor) +
            intervalAfterFirst * earlyFactor;
        return Math.round(interval);
    }
    /* =======================
       VOCAB AVAILABILITY
       ======================= */
    static async hasMoreLearnableVocabulary(progress, settings) {
        const count = await this.countLearnableVocabulary(progress, settings, 1);
        return count > 0;
    }
    static async countLearnableVocabulary(progress, settings, limit = Infinity) {
        let count = 0;
        switch (settings.preferredLearningOrder) {
            case 'kklc': {
                if (progress.kanjiKnowledge.method !== 'kklc')
                    return 0;
                const index = await VocabularyService.loadKKLCIndex();
                if (!index)
                    return 0;
                for (let step = 1; step <= progress.kanjiKnowledge.step; step++) {
                    const ids = index[step] ?? [];
                    for (const id of ids) {
                        if (!progress.learningQueue.find(vocab => vocab.vocabId === id)) {
                            count++;
                            if (count >= limit)
                                return count;
                        }
                    }
                }
                break;
            }
            case 'frequency': {
                const index = await VocabularyService.loadFrequencyIndex();
                if (!index)
                    return 0;
                for (const entry of index) {
                    if (progress.learningQueue.find(vocab => vocab.vocabId === entry.id))
                        continue;
                    const allKanjiKnown = entry.containedKanji.every(k => progress.kanjiKnowledge.kanjiSet.has(k));
                    if (!allKanjiKnown)
                        continue;
                    count++;
                    if (count >= limit)
                        return count;
                }
                break;
            }
        }
        return count;
    }
    /* =======================
       QUEUE REFILL
       ======================= */
    static async refillQueue(currentQueue, kanjiKnowledge, settings, maxToAdd) {
        if (maxToAdd <= 0)
            return currentQueue;
        const queue = [...currentQueue];
        const activeIds = new Set(queue.map(v => v.vocabId));
        switch (settings.preferredLearningOrder) {
            case "kklc":
                if (kanjiKnowledge.method !== "kklc") {
                    throw new Error("Cannot use KKLC vocabulary without KKLC kanji knowledge");
                }
                return this.fillQueueWithKKLC(queue, activeIds, kanjiKnowledge.step, maxToAdd);
            case "frequency":
                return this.fillQueueWithFrequency(queue, activeIds, kanjiKnowledge, maxToAdd);
        }
    }
    /* =======================
       INTERNAL FILLERS
       ======================= */
    static async fillQueueWithKKLC(queue, activeIds, kklcKanjiStep, maxToAdd) {
        const index = await VocabularyService.loadKKLCIndex();
        if (!index)
            return queue;
        let added = 0;
        for (let step = 1; step <= kklcKanjiStep; step++) {
            const ids = index[step] ?? [];
            for (const id of ids) {
                if (added >= maxToAdd)
                    return queue;
                if (activeIds.has(id))
                    continue;
                queue.push(this.createNewVocabProgress(id));
                activeIds.add(id);
                added++;
            }
        }
        return queue;
    }
    static async fillQueueWithFrequency(queue, activeIds, kanjiKnowledge, maxToAdd) {
        const index = await VocabularyService.loadFrequencyIndex();
        if (!index)
            return queue;
        let added = 0;
        for (const entry of index) {
            if (added >= maxToAdd)
                break;
            if (activeIds.has(entry.id))
                continue;
            const allKanjiKnown = entry.containedKanji.every(k => kanjiKnowledge.kanjiSet.has(k));
            if (!allKanjiKnown)
                continue;
            queue.push(this.createNewVocabProgress(entry.id));
            activeIds.add(entry.id);
            added++;
        }
        return queue;
    }
    /* =======================
       HELPERS
       ======================= */
    static createNewVocabProgress(vocabId) {
        return {
            vocabId,
            stage: "learning",
            mastery: 0,
            nextReviewAt: new Date(), // immediately due
            lastReviewedAt: null,
            totalReviews: 0,
            consecutiveFailures: 0,
        };
    }
}
