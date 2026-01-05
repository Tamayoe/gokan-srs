import {SAMPLE_KANJI, SAMPLE_VOCABULARY} from "../assets/mock.ts";
import type {VocabProgress, Vocabulary} from "../models/vocabulary.model.ts";
import {CONSTANTS} from "../commons/constants.ts";

export class SRSService {
    static applyAnswer(
        queue: VocabProgress[],
        index: number,
        isCorrect: boolean
    ): { queue: VocabProgress[]; graduatedVocabId?: string } {
        const [current, ...rest] = queue;

        const updated = {
            ...current,
            correctCount: isCorrect
                ? Math.min(current.correctCount + 1, CONSTANTS.srs.maximumAnswerPoints)
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

    static cleanupAndRefill(
        queue: VocabProgress[],
        knownKanjiCount: number,
        learnedWords: Set<string>
    ): VocabProgress[] {
        return this.fillQueue(queue, knownKanjiCount, learnedWords);
    }

    static fillQueue(
        currentQueue: VocabProgress[],
        knownKanjiCount: number,
        learnedWords: Set<string>,
        maxQueueSize: number = CONSTANTS.srs.queueSize
    ): VocabProgress[] {
        const queue = [...currentQueue];
        const activeIds = new Set(queue.map(item => item.vocabId));

        const available = this.getAvailableVocabulary(knownKanjiCount, learnedWords)
            .filter(vocab => !activeIds.has(vocab.id));
        while (queue.length < maxQueueSize && available.length > 0) {
            const vocab = available.shift()!;
            queue.push({
                vocabId: vocab.id,
                correctCount: CONSTANTS.srs.minimumAnswerPoints,
                lastReviewed: new Date(),
            });
        }

        return queue;
    }

    private static getAvailableVocabulary(knownKanjiCount: number, learnedWords: Set<string>): Vocabulary[] {
        const knownKanji = SAMPLE_KANJI
            .filter(k => k.kklcOrder <= knownKanjiCount)
            .map(k => k.character);

        return SAMPLE_VOCABULARY
            .filter(vocab => {
                if (learnedWords.has(vocab.id)) return false;
                return vocab.containedKanji.some(kanji => knownKanji.includes(kanji));
            })
            .sort((a, b) => a.frequency - b.frequency);
    }
}
