export class QuizService {
    static validateAnswer(userInput, correctReadings) {
        const normalized = (str) => str.trim().toLowerCase();
        return correctReadings.map(normalized).includes(normalized(userInput));
    }
}
