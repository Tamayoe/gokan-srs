// src/services/SRSService.ts
import type { VocabProgress } from '../models/vocabulary.model';
import { CONSTANTS } from '../commons/constants';
import {VocabularyService} from "./vocabulary.service.ts";
import type {KanjiKnowledge, UserSettings} from "../models/user.model.ts";

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
        kanjiKnowledge: KanjiKnowledge,
        learnedWords: Set<string>,
        settings: UserSettings,
    ): Promise<VocabProgress[]> {
        return this.fillQueue(queue, kanjiKnowledge, learnedWords, settings);
    }

    static async fillQueue(
        currentQueue: VocabProgress[],
        kanjiKnowledge: KanjiKnowledge,
        learnedWords: Set<string>,
        settings: UserSettings,
        maxQueueSize: number = CONSTANTS.srs.queueSize
    ): Promise<VocabProgress[]> {
        const queue = [...currentQueue];

        switch (settings.preferredLearningOrder) {
            case "kklc":
                if (kanjiKnowledge.method !== 'kklc') {
                    throw Error('Cannot use KKLC Vocabulary method without KKLC Kanji knowledge')
                }
                return this.fillQueueWithKKLC(
                queue,
                kanjiKnowledge.step,
                learnedWords,
                maxQueueSize,
            );
            case "frequency": return this.fillQueueWithFrequency(
                queue,
                kanjiKnowledge,
                learnedWords,
                maxQueueSize,
            );
        }
    }

    private static async fillQueueWithKKLC(
        queue: VocabProgress[],
        kklcKanjiStep: number,
        learnedWords: Set<string>,
        maxQueueSize: number = CONSTANTS.srs.queueSize
    ) {
        const activeIds = new Set(queue.map(q => q.vocabId));
        const index = await VocabularyService.loadKKLCIndex();

        // Iterate steps progressively
        for (let step = 1; step <= kklcKanjiStep; step++) {
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

    private static async fillQueueWithFrequency(
        queue: VocabProgress[],
        kanjiKnowledge: KanjiKnowledge,
        learnedWords: Set<string>,
        maxQueueSize: number
    ) {
        const activeIds = new Set(queue.map(q => q.vocabId));
        const index = await VocabularyService.loadFrequencyIndex();

        if (!index) {
            throw new Error('Missing frequency index');
        }

        for (const entry of index) {
            if (queue.length >= maxQueueSize) break;
            if (activeIds.has(entry.id)) continue;
            if (learnedWords.has(entry.id)) continue;

            // 🔑 THIS is now trivial
            const allKanjiKnown = entry.containedKanji.every(k =>
                kanjiKnowledge.kanjiSet.has(k)
            );

            if (!allKanjiKnown) continue;

            queue.push({
                vocabId: entry.id,
                correctCount: CONSTANTS.srs.minimumAnswerPoints,
                lastReviewed: new Date(),
            });

            activeIds.add(entry.id);
        }

        return queue;
    }
}