import type {Vocabulary} from "../models/vocabulary.model.ts";
import type {Kanji} from "../models/kanji.model.ts";

export const SAMPLE_KANJI: Kanji[] = [
    { character: '一', kklcOrder: 1, jlptLevel: 5, frequency: 2 },
    { character: '人', kklcOrder: 2, jlptLevel: 5, frequency: 5 },
    { character: '日', kklcOrder: 3, jlptLevel: 5, frequency: 1 },
    { character: '本', kklcOrder: 4, jlptLevel: 5, frequency: 10 },
    { character: '学', kklcOrder: 5, jlptLevel: 5, frequency: 15 },
    { character: '校', kklcOrder: 6, jlptLevel: 5, frequency: 45 },
    { character: '生', kklcOrder: 7, jlptLevel: 5, frequency: 12 },
    { character: '先', kklcOrder: 8, jlptLevel: 5, frequency: 50 },
    { character: '年', kklcOrder: 9, jlptLevel: 5, frequency: 8 },
    { character: '月', kklcOrder: 10, jlptLevel: 5, frequency: 20 },
];

export const SAMPLE_VOCABULARY: Vocabulary[] = [
    { id: 'v001', kanji: '一人', reading: 'ひとり', meaning: 'one person, alone', frequency: 50, containedKanji: ['一', '人'] },
    { id: 'v002', kanji: '人生', reading: 'じんせい', meaning: 'life, human life', frequency: 120, containedKanji: ['人', '生'] },
    { id: 'v003', kanji: '日本', reading: 'にほん', meaning: 'Japan', frequency: 5, containedKanji: ['日', '本'] },
    { id: 'v004', kanji: '本日', reading: 'ほんじつ', meaning: 'today', frequency: 180, containedKanji: ['本', '日'] },
    { id: 'v005', kanji: '学校', reading: 'がっこう', meaning: 'school', frequency: 45, containedKanji: ['学', '校'] },
    { id: 'v006', kanji: '学生', reading: 'がくせい', meaning: 'student', frequency: 30, containedKanji: ['学', '生'] },
    { id: 'v007', kanji: '先生', reading: 'せんせい', meaning: 'teacher', frequency: 25, containedKanji: ['先', '生'] },
    { id: 'v008', kanji: '先日', reading: 'せんじつ', meaning: 'the other day', frequency: 200, containedKanji: ['先', '日'] },
    { id: 'v009', kanji: '一日', reading: 'いちにち', meaning: 'one day', frequency: 80, containedKanji: ['一', '日'] },
    { id: 'v010', kanji: '毎日', reading: 'まいにち', meaning: 'every day', frequency: 35, containedKanji: ['日'] },
    { id: 'v011', kanji: '今年', reading: 'ことし', meaning: 'this year', frequency: 60, containedKanji: ['年'] },
    { id: 'v012', kanji: '一年', reading: 'いちねん', meaning: 'one year', frequency: 90, containedKanji: ['一', '年'] },
    { id: 'v013', kanji: '今月', reading: 'こんげつ', meaning: 'this month', frequency: 110, containedKanji: ['月'] },
    { id: 'v014', kanji: '一月', reading: 'いちがつ', meaning: 'January', frequency: 150, containedKanji: ['一', '月'] },
    { id: 'v015', kanji: '本年', reading: 'ほんねん', meaning: 'this year', frequency: 250, containedKanji: ['本', '年'] },
];