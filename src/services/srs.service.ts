// src/services/SRSService.ts
import type { VocabProgress } from '../models/vocabulary.model';
import { CONSTANTS } from '../commons/constants';
import {VocabularyService} from "./vocabulary.service.ts";

export class SRSService {
    static applyAnswer(
        queue: VocabProgress[],
        index: number,
        isCorrect: boolean
    ): { queue: VocabProgress[]; graduatedVocabId?: string } {
        const [current, ...rest] = queue;

        const updated: VocabProgress = {
            ...current,
            correctCount: isCorrect
                ? Math.min(
                    current.correctCount + 1,
                    CONSTANTS.srs.maximumAnswerPoints,
                )
                : CONSTANTS.srs.minimumAnswerPoints,
            lastReviewed: new Date(),
        };

        if (updated.correctCount >= CONSTANTS.srs.maximumAnswerPoints) {
            return {
                queue: rest,
                graduatedVocabId: current.vocabId,
            };
        }

        return {
            queue: [...rest, updated],
        };
    }

    static async cleanupAndRefill(
        queue: VocabProgress[],
        knownKanjiCount: number,
        learnedWords: Set<string>
    ): Promise<VocabProgress[]> {
        return this.fillQueue(queue, knownKanjiCount, learnedWords);
    }

    static async fillQueue(
        currentQueue: VocabProgress[],
        knownKanjiCount: number,
        learnedWords: Set<string>,
        maxQueueSize: number = CONSTANTS.srs.queueSize
    ): Promise<VocabProgress[]> {
        const queue = [...currentQueue];
        const activeIds = new Set(queue.map(q => q.vocabId));

        const index = await VocabularyService.loadKKLCIndex();

        // Iterate steps progressively
        for (let step = 1; step <= knownKanjiCount; step++) {
            const ids = index ? index[step] : null;
            if (!ids) continue;

            for (const id of ids) {
                if (queue.length >= maxQueueSize) return queue;
                if (activeIds.has(id)) continue;
                if (learnedWords.has(id)) continue;

                queue.push({
                    vocabId: id,
                    correctCount: CONSTANTS.srs.minimumAnswerPoints,
                    lastReviewed: new Date(),
                });

                activeIds.add(id);
            }
        }

        return queue;
    }
}