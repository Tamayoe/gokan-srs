import fs from "fs";
import {Kanji} from "../src/models/kanji.model";
import {parseJPDBEntry} from "./build-common";
import {KKLCDatasetDTO} from "../src/models/data.model";

const kklcPath = './data/raw/kklc.json';
const jpdbPath = './data/raw/jpdb_v2.json';

const kklc: KKLCDatasetDTO[] = JSON.parse(fs.readFileSync(kklcPath, 'utf-8'));
const jpdb: Record<string, string> = JSON.parse(fs.readFileSync(jpdbPath, 'utf-8'));

const kanjiMap = new Map<string, Kanji>();

let kklcCounter = 1;

for (const group of kklc) {
    for (const chapter of group.chapters) {
        for (const char of chapter.kanji) {
            kanjiMap.set(char, {
                character: char,
                steps: { kklc: kklcCounter++ },
                frequency: jpdb[char] ? parseJPDBEntry(jpdb[char]).kanjiRank : undefined,
            });
        }
    }
}
const kanjis = Array.from(kanjiMap.values());

fs.writeFileSync(
    './data/compiled/kanji.json',
    JSON.stringify(kanjis, null, 2),
);

const kklcKanjiIndex: Record<number, string[]> = {};

for (const kanji of kanjiMap.values()) {
    const step = kanji.steps.kklc;
    if (!step) continue;

    if (!kklcKanjiIndex[step]) {
        kklcKanjiIndex[step] = [];
    }

    kklcKanjiIndex[step].push(kanji.character);
}

fs.writeFileSync(
    './data/compiled/index/kklc-kanji.json',
    JSON.stringify(kklcKanjiIndex, null, 2),
);