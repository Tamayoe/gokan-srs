import React, {useState} from "react";
import {THEME} from "../../commons/theme.ts";
import {CONSTANTS} from "../../commons/constants.ts";
import {Logo} from "../../components/Logo.tsx";

export const SetupScreen: React.FC<{ onComplete: (kanjiCount: number) => void }> = ({ onComplete }) => {
    const [kanjiCount, setKanjiCount] = useState<string>(CONSTANTS.setup.defaultKanjiCount);

    const handleSubmit = () => {
        const count = parseInt(kanjiCount, 10);
        if (count > CONSTANTS.setup.minimumKanjiCount && count <= CONSTANTS.setup.maximumKanjiCount) {
            onComplete(count);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-8"
            style={{ backgroundColor: THEME.colors.background }}
        >
            <div className="w-full max-w-lg">
                <div className="text-center mb-16">
                    <Logo className="justify-center mb-6" />
                    <p
                        className="font-sans text-sm"
                        style={{ color: THEME.colors.secondary }}
                    >
                        A focused vocabulary learning system
                    </p>
                </div>

                <div
                    className="border rounded p-8 space-y-6"
                    style={{
                        backgroundColor: THEME.colors.surface,
                        borderColor: THEME.colors.divider
                    }}
                >
                    <div>
                        <label
                            htmlFor="kanjiCount"
                            className="block text-sm font-sans font-medium mb-3"
                            style={{ color: THEME.colors.primary }}
                        >
                            Known kanji count (KKLC order)
                        </label>
                        <input
                            id="kanjiCount"
                            type="number"
                            min="1"
                            max="2300"
                            value={kanjiCount}
                            onChange={(e) => setKanjiCount(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border-2 rounded font-sans text-lg focus:outline-none transition-colors"
                            style={{
                                borderColor: THEME.colors.divider,
                                color: THEME.colors.primary,
                            }}
                            onFocus={(e) => e.target.style.borderColor = THEME.colors.accent}
                            onBlur={(e) => e.target.style.borderColor = THEME.colors.divider}
                            placeholder="e.g., 100"
                        />
                        <p
                            className="mt-2 text-xs font-sans"
                            style={{ color: THEME.colors.secondary }}
                        >
                            Enter the number of kanji you have learned (1–2300)
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full font-sans font-medium py-3 px-6 rounded transition-colors"
                        style={{
                            backgroundColor: THEME.colors.accent,
                            color: THEME.colors.surface,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accentHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.colors.accent}
                    >
                        Begin
                    </button>
                </div>

                <div
                    className="mt-6 text-center text-xs font-sans"
                    style={{ color: THEME.colors.secondary }}
                >
                    Vocabulary is selected based on kanji you already know
                </div>
            </div>
        </div>
    );
};