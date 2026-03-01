import type { Vocabulary } from "../models/vocabulary.model";

import { SRSService } from "./srs.service";

export class QuizService {
    /**
     * @deprecated Use SRSService.evaluateAnswer directly for detailed feedback
     */
    static validateAnswer(userInput: string, correctReadings: Vocabulary['reading']): boolean {
        const { result } = SRSService.evaluateAnswer(userInput, correctReadings);
        return result === 'correct';
    }
}

