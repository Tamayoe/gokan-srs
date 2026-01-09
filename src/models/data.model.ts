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


export interface JMDict {
    version: string
    languages: string[]
    commonOnly: boolean
    dictDate: string
    dictRevisions: string[]
    tags: Tags
    words: Word[]
}

export interface Tags {
    v5uru: string
    "v2g-s": string
    dei: string
    ship: string
    leg: string
    bra: string
    music: string
    quote: string
    pref: string
    ktb: string
    rK: string
    derog: string
    abbr: string
    exp: string
    astron: string
    "v2g-k": string
    "aux-v": string
    ctr: string
    surg: string
    baseb: string
    serv: string
    genet: string
    geogr: string
    dent: string
    "v5k-s": string
    horse: string
    ornith: string
    "v2w-s": string
    sK: string
    rk: string
    hob: string
    male: string
    motor: string
    vidg: string
    "n-pref": string
    "n-suf": string
    suf: string
    hon: string
    biol: string
    pol: string
    vulg: string
    "v2n-s": string
    mil: string
    golf: string
    min: string
    X: string
    sk: string
    jpmyth: string
    sl: string
    fict: string
    art: string
    stat: string
    cryst: string
    pathol: string
    photo: string
    food: string
    n: string
    thb: string
    fish: string
    "v5r-i": string
    arch: string
    v1: string
    bus: string
    tv: string
    euph: string
    embryo: string
    "v2y-k": string
    uk: string
    rare: string
    "v2a-s": string
    hanaf: string
    figskt: string
    agric: string
    given: string
    physiol: string
    "v5u-s": string
    chn: string
    ev: string
    adv: string
    prt: string
    vi: string
    "v2y-s": string
    kyb: string
    vk: string
    grmyth: string
    vn: string
    electr: string
    gardn: string
    "adj-kari": string
    vr: string
    vs: string
    internet: string
    vt: string
    cards: string
    stockm: string
    vz: string
    aux: string
    "v2h-s": string
    kyu: string
    noh: string
    econ: string
    rommyth: string
    ecol: string
    "n-t": string
    psy: string
    proverb: string
    company: string
    poet: string
    ateji: string
    paleo: string
    "v2h-k": string
    civeng: string
    go: string
    "adv-to": string
    ent: string
    unc: string
    unclass: string
    "on-mim": string
    yoji: string
    "n-adv": string
    print: string
    form: string
    obj: string
    osb: string
    "adj-shiku": string
    Christn: string
    hum: string
    obs: string
    relig: string
    iK: string
    "v2k-s": string
    conj: string
    "v2s-s": string
    geol: string
    geom: string
    anat: string
    nab: string
    ski: string
    hist: string
    fam: string
    myth: string
    gramm: string
    "v2k-k": string
    id: string
    v5aru: string
    psyanal: string
    comp: string
    creat: string
    ik: string
    oth: string
    "v-unspec": string
    io: string
    work: string
    "adj-ix": string
    phil: string
    doc: string
    math: string
    pharm: string
    "adj-nari": string
    "v2r-k": string
    "adj-f": string
    "adj-i": string
    audvid: string
    rkb: string
    "adj-t": string
    "v2r-s": string
    Buddh: string
    biochem: string
    "v2b-k": string
    "vs-s": string
    surname: string
    physics: string
    place: string
    "v2b-s": string
    kabuki: string
    prowres: string
    product: string
    "vs-c": string
    tsug: string
    "adj-ku": string
    telec: string
    "vs-i": string
    "v2z-s": string
    organization: string
    char: string
    engr: string
    logic: string
    "v2m-s": string
    col: string
    archeol: string
    cop: string
    num: string
    aviat: string
    "aux-adj": string
    "m-sl": string
    fem: string
    MA: string
    finc: string
    "v1-s": string
    "v2m-k": string
    manga: string
    shogi: string
    group: string
    "adj-no": string
    "adj-na": string
    sens: string
    law: string
    vet: string
    mahj: string
    v4b: string
    rail: string
    v4g: string
    elec: string
    film: string
    mining: string
    v4h: string
    v4k: string
    v4m: string
    v4n: string
    sumo: string
    v4s: string
    v4r: string
    person: string
    v4t: string
    boxing: string
    oK: string
    cloth: string
    joc: string
    politics: string
    "v2t-k": string
    tsb: string
    v5b: string
    ling: string
    bot: string
    "v2t-s": string
    v5g: string
    med: string
    v5k: string
    mech: string
    v5n: string
    v5m: string
    "v2d-k": string
    v5r: string
    v5t: string
    v5s: string
    v5u: string
    Shinto: string
    station: string
    chmyth: string
    dated: string
    "v2d-s": string
    psych: string
    "adj-pn": string
    ok: string
    met: string
    chem: string
    sports: string
    zool: string
    int: string
    tradem: string
    "net-sl": string
    "n-pr": string
    archit: string
    ksb: string
    pn: string
    gikun: string
}

export interface Word {
    id: string
    kanji: Kanji[]
    kana: Kana[]
    sense: Sense[]
}

export interface Kanji {
    common: boolean
    text: string
    tags: any[]
}

export interface Kana {
    common: boolean
    text: string
    tags: any[]
    appliesToKanji: string[]
}

export interface Sense {
    partOfSpeech: string[]
    appliesToKanji: string[]
    appliesToKana: string[]
    related: string[][]
    antonym: unknown[]
    field: unknown[]
    dialect: unknown[]
    misc: Array<keyof Tags>
    info: unknown[]
    languageSource: LanguageSource[]
    gloss: Gloss[]
}

export interface LanguageSource {
    lang: string
    full: boolean
    wasei: boolean
    text: string
}

export interface Gloss {
    lang: string
    gender: unknown
    type?: string
    text: string
}