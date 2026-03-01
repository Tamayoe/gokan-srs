import type { IpadicFeatures, Tokenizer } from 'kuromoji';

export interface TokenMatch {
    start: number;
    length: number;
    reading?: string;
}

function katakanaToHiragana(katakana: string): string {
    return katakana.replace(/[\u30A1-\u30F6]/g, function (match) {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
}

export class SentenceTokenizer {
    private tokenizer: Tokenizer<IpadicFeatures>;

    constructor(tokenizer: Tokenizer<IpadicFeatures>) {
        this.tokenizer = tokenizer;
    }

    /**
     * Finds matches for a given vocabulary within a Japanese sentence.
     * @param text The full Japanese sentence
     * @param vocabularies An array or Set of known vocabulary words to search for
     * @returns A map of vocab words to their match positions in the sentence
     */
    public extractMatches(text: string, vocabularies: string[] | Set<string>): Record<string, TokenMatch> {
        const matches: Record<string, TokenMatch> = {};
        const vocabSet = vocabularies instanceof Set ? vocabularies : new Set(vocabularies);
        const tokens = this.tokenizer.tokenize(text);

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // 1. Direct dictionary form matching
            const targetTerm = token.basic_form && token.basic_form !== '*' ? token.basic_form : token.surface_form;

            if (vocabSet.has(targetTerm)) {
                if (!matches[targetTerm]) {
                    matches[targetTerm] = {
                        start: token.word_position - 1,
                        length: token.surface_form.length,
                        reading: token.reading ? katakanaToHiragana(token.reading) : undefined
                    };
                }
            }

            // 2. Sliding window compound matching
            let surfaceWindow = "";
            let readingWindow = "";
            const startPos = token.word_position - 1;

            for (let j = 0; j < 5 && (i + j) < tokens.length; j++) {
                surfaceWindow += tokens[i + j].surface_form;
                readingWindow += tokens[i + j].reading || "";

                const readingHiragana = readingWindow ? katakanaToHiragana(readingWindow) : undefined;

                if (vocabSet.has(surfaceWindow)) {
                    if (!matches[surfaceWindow]) {
                        matches[surfaceWindow] = {
                            start: startPos,
                            length: surfaceWindow.length,
                            reading: readingHiragana
                        };
                    }
                }

                if (surfaceWindow.endsWith("かい")) {
                    // Try basic hiragana deinflection ("をかう")
                    const deinflectedHiragana = surfaceWindow.slice(0, -2) + "かう";
                    // For reading, "かい" -> "カイ" -> "かう", actually Kuromoji reading might be "ヲカイ", so we'd fix it.
                    // But Kuromoji's reading for the conjugated word is typically exactly what we want for Furigana!
                    // e.g. "ヲカイ" -> "をかい". 
                    if (vocabSet.has(deinflectedHiragana)) {
                        if (!matches[deinflectedHiragana]) {
                            matches[deinflectedHiragana] = {
                                start: startPos,
                                length: surfaceWindow.length,
                                reading: readingHiragana
                            };
                        }
                    }

                    // Try Kanji deinflection ("を買う" - typical for JMDict expressions)
                    const deinflectedKanji = surfaceWindow.slice(0, -2) + "買う";
                    if (vocabSet.has(deinflectedKanji)) {
                        if (!matches[deinflectedKanji]) {
                            matches[deinflectedKanji] = {
                                start: startPos,
                                length: surfaceWindow.length,
                                reading: readingHiragana
                            };
                        }
                    }
                }
            }
        }

        return matches;
    }
}
