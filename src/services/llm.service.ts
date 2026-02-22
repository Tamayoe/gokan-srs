import type { Vocabulary } from "../models/vocabulary.model";
import type { Sentence } from "../models/sentence.model";

export class LLMService {
    /**
     * Validates if a user's answer is a valid translation for a Japanese vocabulary word
     * given the specific context of a sentence.
     * 
     * @param apiKey The user's Gemini API key
     * @param vocab The target vocabulary being tested
     * @param sentence The sentence providing context
     * @param userAnswer The user's submitted English meaning
     * @returns A boolean indicating if the answer is considered correct in context
     */
    static async validateMeaningContext(
        apiKey: string,
        vocab: Vocabulary,
        sentence: Sentence,
        userAnswer: string
    ): Promise<{ correct: boolean, reason?: string }> {
        if (!apiKey) {
            throw new Error("No API key provided for Gemini validation");
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Get English translation of the sentence (use the first one available)
        const sentenceTranslation = sentence.en?.[0]?.text || "No translation provided.";

        // Flatten glosses for prompt
        const dictionaryMeanings = vocab.senses.flatMap(s => s.glosses).join(', ');

        const prompt = `You are a strict Japanese grading assistant for a Spaced Repetition System.
Your job is to determine if a user's English answer is a valid contextual translation for a specific Japanese vocabulary word.

Context:
- Japanese Vocabulary: ${vocab.writtenForm.kanji} (Reading: ${vocab.reading.primary})
- Dictionary Meanings: ${dictionaryMeanings}
- Example Sentence (Japanese): ${sentence.original}
- Example Sentence (English Translation): ${sentenceTranslation}

The user has submitted this meaning for the vocabulary word: "${userAnswer}"

Is the user's answer a correct, commonly accepted, or valid contextual translation for the vocabulary word *as it is used in the given sentence*?
- Allow synonyms or slight phrasing differences if they capture the precise meaning *in this context*.
- Do NOT be overly generous. If the answer is completely grammatically wrong or means something fundamentally different, reject it.
- If the word has multiple dictionary meanings, it only needs to match the one intended by the sentence context.

Respond ONLY with valid JSON in the following schema:
{
  "correct": boolean,
  "reason": "A brief 1-2 sentence explanation of why it was accepted or rejected"
}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "object",
                            properties: {
                                correct: { type: "boolean" },
                                reason: { type: "string" }
                            },
                            required: ["correct", "reason"]
                        }
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            // Extract the result from the Gemini response structure
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
                const textResult = data.candidates[0].content.parts[0].text;

                // We requested JSON, so it should parse safely
                try {
                    const result = JSON.parse(textResult);
                    return {
                        correct: result.correct === true,
                        reason: result.reason
                    };
                } catch (parseError) {
                    console.error("[LLMService] Failed to parse Gemini response", parseError);
                    return { correct: false, reason: "Failed to parse AI response format." };
                }
            }

            return { correct: false, reason: "Empty response from AI." };

        } catch (error) {
            console.error("[LLMService] API Call Failed:", error);
            // On catastrophic failure, fail safe (mark wrong, user can read standard feedback)
            return { correct: false, reason: `API Error: ${error instanceof Error ? error.message : 'Unknown'}` };
        }
    }
}
