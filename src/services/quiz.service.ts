export class QuizService {
    static validateAnswer(userInput: string, correctReadings: string[]): boolean {
        const normalized = (str: string) => str.trim().toLowerCase();
        return correctReadings.map(normalized).includes(normalized(userInput));
    }
}

