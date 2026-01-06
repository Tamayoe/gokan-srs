// ============================================================================
// EXTERNAL DATASET DTOs (Raw data structures from sources)
// ============================================================================

/**
 * KKLC Kanji Dataset
 * Source: https://github.com/ppasupat/vocab-kanji/blob/master/data/kanji/kklc.json
 *
 * Actual structure from the repository
 */
export interface KKLCDatasetDTO {
    shortname: string;           // "0"
    name: string;                // "1-100"
    chapters: KKLCChapterDTO[];
}

export interface KKLCChapterDTO {
    name: string;                // "1", "21", "41"...
    kanji: string;               // "日一二三十四五六七八九丸円〇人百千万口田"
}

/**
 * JPDB Frequency Dataset
 * Source: https://raw.githubusercontent.com/Kuuuube/Kuuuube.github.io/refs/heads/main/japanese-word-frequency/JPDB_v2.js
 *
 * Format: JavaScript file with object
 * const jpdb_v2_json = { "今日":"122, 6099㋕", "ほど":"123㋕", ... }
 */
export interface JPDBFrequencyDTO {
    [word: string]: string;      // "今日" -> "122, 6099㋕"
    // First number = kanji frequency rank
    // Second number (if exists) = hiragana frequency rank
    // ㋕ marker indicates hiragana version
}

/**
 * Parsed JPDB frequency entry
 */
export interface ParsedJPDBFrequency {
    word: string;                // "今日"
    kanjiRank?: number;          // 122 (if word contains kanji)
    hiraganaRank?: number;       // 6099 (if ㋕ marker present)
}