import {SAMPLE_KANJI, SAMPLE_VOCABULARY} from "../assets/mock.ts";
import type {VocabProgress, Vocabulary} from "../models/vocabulary.model.ts";
import {CONSTANTS} from "../commons/constants.ts";

export class SRSService {
    static getAvailableVocabulary(knownKanjiCount: number, learnedWords: Set<string>): Vocabulary[] {
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

    static handleAnswer(
        vocabId: string,
        isCorrect: boolean,
        currentQueue: VocabProgress[]
    ): { newQueue: VocabProgress[]; graduated: boolean } {
        const queue = [...currentQueue];
        const itemIndex = queue.findIndex(item => item.vocabId === vocabId);

        if (itemIndex === -1) {
            return { newQueue: queue, graduated: false };
        }

        const item = { ...queue[itemIndex] };

        if (isCorrect) {
            item.correctCount = Math.min(item.correctCount + CONSTANTS.srs.correctAnswerPointModification, CONSTANTS.srs.maximumAnswerPoints);
        } else {
            item.correctCount = Math.max(item.correctCount + CONSTANTS.srs.incorrectAnswerPointModidication, CONSTANTS.srs.minimumAnswerPoints);
        }

        item.lastReviewed = new Date();

        if (item.correctCount >= CONSTANTS.srs.maximumAnswerPoints) {
            queue.splice(itemIndex, 1);
            return { newQueue: queue, graduated: true };
        }

        queue[itemIndex] = item;
        return { newQueue: queue, graduated: false };
    }
}