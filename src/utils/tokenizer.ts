import type { IpadicFeatures, Tokenizer } from 'kuromoji';

export interface TokenMatch {
    start: number;
    length: number;
}

export class SentenceTokenizer {
    private tokenizer: Tokenizer<IpadicFeatures>;

    constructor(tokenizer: Tokenizer<IpadicFeatures>) {
        this.tokenizer = tokenizer;
    }

    /**
     * Finds matches for a given vocabulary within a Japanese sentence.
     * @param text The full Japanese sentence
     * @param vocabularies An array of known vocabulary words to search for
     * @returns A map of vocab words to their match positions in the sentence
     */
    public extractMatches(text: string, vocabularies: string[]): Record<string, TokenMatch> {
        const matches: Record<string, TokenMatch> = {};
        const vocabSet = new Set(vocabularies);
        const tokens = this.tokenizer.tokenize(text);

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // 1. Direct dictionary form matching
            const targetTerm = token.basic_form && token.basic_form !== '*' ? token.basic_form : token.surface_form;

            if (vocabSet.has(targetTerm)) {
                if (!matches[targetTerm]) {
                    matches[targetTerm] = { start: token.word_position - 1, length: token.surface_form.length };
                }
            }

            // 2. Sliding window compound matching
            let surfaceWindow = "";
            let startPos = token.word_position - 1;

            for (let j = 0; j < 5 && (i + j) < tokens.length; j++) {
                surfaceWindow += tokens[i + j].surface_form;

                if (vocabSet.has(surfaceWindow)) {
                    if (!matches[surfaceWindow]) {
                        matches[surfaceWindow] = { start: startPos, length: surfaceWindow.length };
                    }
                }

                if (surfaceWindow.endsWith("かい")) {
                    // Try basic hiragana deinflection ("をかう")
                    const deinflectedHiragana = surfaceWindow.slice(0, -2) + "かう";
                    if (vocabSet.has(deinflectedHiragana)) {
                        if (!matches[deinflectedHiragana]) {
                            matches[deinflectedHiragana] = { start: startPos, length: surfaceWindow.length };
                        }
                    }

                    // Try Kanji deinflection ("を買う" - typical for JMDict expressions)
                    const deinflectedKanji = surfaceWindow.slice(0, -2) + "買う";
                    if (vocabSet.has(deinflectedKanji)) {
                        if (!matches[deinflectedKanji]) {
                            matches[deinflectedKanji] = { start: startPos, length: surfaceWindow.length };
                        }
                    }
                }
            }
        }

        return matches;
    }
}
