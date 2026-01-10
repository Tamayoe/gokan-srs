import React, {useEffect, useMemo, useState} from "react";
import {THEME} from "../../commons/theme.ts";
import {CONSTANTS} from "../../commons/constants.ts";
import {VocabularyService} from "../../services/vocabulary.service.ts";
import type {
    KanjiKnowledge,
    KanjiLearningMethod,
    LearningOrder,
    UserProgress,
    UserSettings
} from "../../models/user.model.ts";
import {KanjiField} from "../../components/KanjiField.tsx";
import {OptionGrid} from "../../components/OptionGrid.tsx";
import {KanjiCountInput} from "../../components/KanjiCountInput.tsx";
import {SetupHeader} from "../../components/SetupHeader.tsx";

export function SetupScreen({ onComplete }) {
    const [kanjiCount, setKanjiCount] = useState(
        Number(CONSTANTS.setup.defaultKanjiCount)
    );
    const [allKanji, setAllKanji] = useState<string[]>([]);
    const [kanjiMethod, setKanjiMethod] = useState<'kklc'>('kklc');
    const [learningOrder, setLearningOrder] = useState<LearningOrder>('frequency');

    useEffect(() => {
        let cancelled = false;

        VocabularyService.loadKKLCKanjiIndex().then(index => {
            if (!index || cancelled) return;

            const kanji: string[] = [];
            for (let i = 1; i <= Object.keys(index).length; i++) {
                kanji.push(...(index[i] ?? []));
            }

            setAllKanji(kanji);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const knownKanji = useMemo(
        () => allKanji.slice(0, kanjiCount),
        [allKanji, kanjiCount]
    );

    const handleSubmit = () => {
        if (
            kanjiCount >= CONSTANTS.setup.minimumKanjiCount &&
            kanjiCount <= CONSTANTS.setup.maximumKanjiCount
        ) {
            const values: SetupValues = {
                kanjiKnowledge: {
                    method: kanjiMethod,
                    step: kanjiCount,
                    kanjiSet: new Set(knownKanji),
                },
                settings: {
                    preferredLearningOrder: learningOrder,
                }
            }
            onComplete(values);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >
            <div className="max-w-3xl mx-auto p-8 space-y-12">
                <SetupHeader />

                <OptionGrid
                    title="Kanji learning method"
                    value={kanjiMethod}
                    onChange={setKanjiMethod}
                    options={[
                        {
                            value: 'kklc',
                            label: 'KKLC',
                            description: 'Traditional school-based order',
                        },
                    ]}
                />

                <KanjiCountInput
                    kanjiCount={kanjiCount}
                    setKanjiCount={setKanjiCount}
                />

                <KanjiField
                    allKanji={allKanji}
                    knownKanjiSet={new Set(knownKanji)}
                />

                <OptionGrid
                    title="Vocabulary order"
                    value={learningOrder}
                    onChange={setLearningOrder}
                    options={[
                        {
                            value: 'frequency',
                            label: 'Frequency',
                            description: 'Most common words first',
                        },
                        {
                            value: 'kklc',
                            label: 'By Kanji',
                            description: 'Follow kanji progression',
                        },
                    ]}
                />

                <footer className="pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!knownKanji}
                        className="w-full rounded-lg py-4 text-lg transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                            fontFamily: THEME.fonts.serif,
                        }}
                    >
                        Start learning
                    </button>
                </footer>
            </div>
        </div>
    );
}
