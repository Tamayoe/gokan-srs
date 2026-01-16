import type {Vocabulary} from "../models/vocabulary.model";

export class QuizService {
    static validateAnswer(userInput: string, correctReadings: Vocabulary['reading']): boolean {
        const normalized = (str: string) => str.trim().toLowerCase();
        const normalizedInput = normalized(userInput)
        return normalized(correctReadings.primary) === normalizedInput || correctReadings.alternatives.map(normalized).includes(normalizedInput)
    }
}

