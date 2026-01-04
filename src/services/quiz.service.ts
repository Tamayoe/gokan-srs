export class QuizService {
    static validateAnswer(userInput: string, correctReading: string): boolean {
        const normalized = (str: string) => str.trim().toLowerCase();
        return normalized(userInput) === normalized(correctReading);
    }
}