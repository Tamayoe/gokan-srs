export interface DeinflectedToken {
    term: string;
    rules: string[]; // List of rules applied (e.g. "te-form", "past")
}

/**
 * Japanese Deinflector
 * Based on Rikaichan/Yomichan deinflector rules.
 * 
 * Takes a conjugated surface form and returns possible dictionary forms.
 */
export class Deinflector {

    // Rule structure: [suffix_from, suffix_to, rule_name]
    private static rules: [string, string, string][] = [
        // Standard EDICT2 / Rikaichan rules
        ["く", "く", ""], // dictionary form
        ["いる", "いる", ""], // ichidan dictionary form

        // Polite (Masu)
        ["ます", "る", "polite ichidan"],
        ["ます", "む", "polite yodan mu"],
        ["ます", "ぶ", "polite yodan bu"],
        ["ます", "ぬ", "polite yodan nu"],
        ["ます", "く", "polite yodan ku"],
        ["ます", "ぐ", "polite yodan gu"],
        ["ます", "う", "polite yodan u"],
        ["ます", "つ", "polite yodan tsu"],
        ["ます", "る", "polite yodan ru"],
        ["ます", "す", "polite yodan su"],

        // Polite Past (Maschita)
        ["ました", "る", "polite past ichidan"],
        ["ました", "む", "polite past yodan mu"],
        ["ました", "ぶ", "polite past yodan bu"],
        ["ました", "ぬ", "polite past yodan nu"],
        ["ました", "く", "polite past yodan ku"],
        ["ました", "ぐ", "polite past yodan gu"],
        ["ました", "う", "polite past yodan u"],
        ["ました", "つ", "polite past yodan tsu"],
        ["ました", "る", "polite past yodan ru"],
        ["ました", "す", "polite past yodan su"],

        // Polite Negative (Masen)
        ["ません", "る", "polite neg ichidan"],
        ["ません", "む", "polite neg yodan mu"],
        ["ません", "ぶ", "polite neg yodan bu"],
        ["ません", "ぬ", "polite neg yodan nu"],
        ["ません", "く", "polite neg yodan ku"],
        ["ません", "ぐ", "polite neg yodan gu"],
        ["ません", "う", "polite neg yodan u"],
        ["ません", "つ", "polite neg yodan tsu"],
        ["ません", "る", "polite neg yodan ru"],
        ["ません", "す", "polite neg yodan su"],

        // Te-form
        ["て", "る", "te-form ichidan"],
        ["んで", "む", "te-form yodan mu"],
        ["んで", "ぶ", "te-form yodan bu"],
        ["んで", "ぬ", "te-form yodan nu"],
        ["いて", "く", "te-form yodan ku"],
        ["いで", "ぐ", "te-form yodan gu"],
        ["って", "う", "te-form yodan u"],
        ["って", "つ", "te-form yodan tsu"],
        ["って", "る", "te-form yodan ru"],
        ["して", "す", "te-form yodan su"],

        // Past (Ta-form)
        ["た", "る", "past ichidan"],
        ["んだ", "む", "past yodan mu"],
        ["んだ", "ぶ", "past yodan bu"],
        ["んだ", "ぬ", "past yodan nu"],
        ["いた", "く", "past yodan ku"],
        ["いだ", "ぐ", "past yodan gu"],
        ["った", "う", "past yodan u"],
        ["った", "つ", "past yodan tsu"],
        ["った", "る", "past yodan ru"],
        ["した", "す", "past yodan su"],

        // Negative (Nai)
        ["ない", "る", "negative ichidan"],
        ["な", "る", "negative ichidan (short)"], // e.g. 食べな
        ["わない", "う", "negative yodan u"],
        ["かない", "く", "negative yodan ku"],
        ["がない", "ぐ", "negative yodan gu"],
        ["さない", "す", "negative yodan su"],
        ["たない", "つ", "negative yodan tsu"],
        ["なない", "ぬ", "negative yodan nu"],
        ["ばない", "ぶ", "negative yodan bu"],
        ["まない", "む", "negative yodan mu"],
        ["らない", "る", "negative yodan ru"],

        // Passive / Potential / Causative (common ones only for now)
        ["られる", "る", "passive/potential ichidan"],
        ["れる", "る", "passive/potential ichidan (ra-removed)"], // tabereru
        ["かれる", "く", "passive yodan ku"],
        ["がれる", "ぐ", "passive yodan gu"],
        // ... (can expand as needed, or use a more comprehensive JSON rule set in future)

        // Tai form (Want to)
        ["たい", "る", "tai ichidan"],
        ["いたい", "く", "tai yodan ku"],
        ["ぎたい", "ぐ", "tai yodan gu"],
        ["したい", "す", "tai yodan su"],
        ["ちたい", "つ", "tai yodan tsu"],
        ["にたい", "ぬ", "tai yodan nu"],
        ["びたい", "ぶ", "tai yodan bu"],
        ["みたい", "む", "tai yodan mu"],
        ["りたい", "る", "tai yodan ru"],
        ["いたい", "う", "tai yodan u"],
    ];

    /**
     * Attempts to deinflect a surface string.
     * Guaranteed to return at least the original string with no rules.
     */
    static deinflect(surface: string): DeinflectedToken[] {
        const results: DeinflectedToken[] = [];

        // Always include the original (it might be dictionary form already)
        results.push({ term: surface, rules: [] });

        for (const [suffixFrom, suffixTo, ruleName] of this.rules) {
            if (surface.endsWith(suffixFrom)) {
                const stem = surface.substring(0, surface.length - suffixFrom.length);
                const dictionaryForm = stem + suffixTo;

                // Heuristic: stems usually have at least 1 char (unless word came from 1 char?)
                // e.g. "k" + "ita" = "kita". stem "k" OK.
                if (stem.length > 0 || (stem.length === 0 && suffixTo.length > 0)) {
                    results.push({
                        term: dictionaryForm,
                        rules: [ruleName]
                    });
                }

                // Recursive deinflection? 
                // Usually standard deinflectors run recursively (e.g. tabetakunakatta -> tabetakunai -> tabetai -> taberu)
                // For now, let's keep it simple: Single level. 
                // If we need "didn't want to eat", that's complex. 
                // But most target vocab in sentences will be fairly simple or we can just add combined rules.
            }
        }

        // Manual Edge Cases (Irregular verbs)
        // Kuru (to come)
        if (surface === "来る" || surface === "来ます" || surface === "来て" || surface === "来た" || surface === "来ない") results.push({ term: "来る", rules: ["irregular"] });
        if (surface === "くる" || surface === "きます" || surface === "きて" || surface === "きた" || surface === "こない") results.push({ term: "くる", rules: ["irregular"] });

        // Suru (to do) - often attached to nouns, but we might matching "suru" itself
        if (surface === "する" || surface === "します" || surface === "して" || surface === "した" || surface === "しない") results.push({ term: "する", rules: ["irregular"] });


        return results;
    }
}
