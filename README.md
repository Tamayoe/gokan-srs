<div align="center">

# 語感 Gokan

**Japanese vocabulary that unlocks with the kanji you already know.**

A spaced repetition system that never tests you on a word you could not possibly read, plus a free dictionary covering 38,000 words, 2,300 kanji, and 755 grammar points.

[Use the app](https://gokan-srs.com) &nbsp;&middot;&nbsp; [Browse the dictionary](https://gokan-srs.com/dictionary/) &nbsp;&middot;&nbsp; [Open dataset](https://github.com/gokan-dev/gokan-dataset)

[![Deploy](https://github.com/gokan-dev/gokan-srs/actions/workflows/deploy.yml/badge.svg)](https://github.com/gokan-dev/gokan-srs/actions/workflows/deploy.yml)
[![Dataset: CC BY-SA 4.0](https://img.shields.io/badge/dataset-CC%20BY--SA%204.0-blue)](https://github.com/gokan-dev/gokan-dataset)

<img src="docs/assets/hero.png" alt="Gokan SRS study session" width="820">

</div>

## Why another SRS

Most flashcard tools treat vocabulary as a flat list. You get 常用漢字-heavy words on day three and no way to tell which ones you can actually read yet, so you end up memorizing shapes instead of learning words.

Gokan inverts that. It knows which kanji you have studied, and only introduces words built from those kanji. Every word you see is one you could read aloud. When you learn a new kanji, the vocabulary that depends on it unlocks.

The name 語感 (*gokan*) means "sense of language": the intuitive feel that comes from repeated, deliberate exposure.

## What it does

**Kanji-gated vocabulary.** Tell it where you are in KKLC, RTK, or a JLPT level, and it filters the 36,000-word dictionary down to what you can currently read. No word appears before its kanji do.

**Reading and meaning tested separately.** Each word carries two independent review schedules: type the reading in hiragana, and recall the meaning from a real sentence. They are staggered so the two do not give each other away.

**Scheduling that reacts to how you answer.** The algorithm tracks per-word difficulty and response latency, so a slow correct answer earns a shorter interval than a fast one. It targets 75% recall, the point the research identifies as best for long-term retention without over-reviewing.

**Grammar as a second activity.** 755 grammar points from N5 to N1, drilled as fill-in-the-blank exercises against real sentences, on their own SRS schedule. Grammar practice also feeds credit back into the vocabulary in those sentences.

**Real sentences, not invented ones.** A build-time pipeline links every word to Tatoeba sentences and tokenizes them, so example sentences are clickable word by word.

**No backend, no account required.** The SRS engine runs entirely in your browser. Progress stays in local storage unless you opt into Google Drive sync, which writes to a single private file in your own Drive.

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/assets/quiz-reading.png" alt="Reading quiz card"></td>
<td width="50%"><img src="docs/assets/hub.png" alt="Activity hub"></td>
</tr>
<tr>
<td>Reading review. Type the hiragana; the mastery ring tracks the word's strength.</td>
<td>The hub. Each activity previews what the next session holds.</td>
</tr>
<tr>
<td><img src="docs/assets/grammar-quiz.png" alt="Grammar cloze exercise"></td>
<td><img src="docs/assets/stats.png" alt="Statistics screen"></td>
</tr>
<tr>
<td>Grammar drill. Fill the blanks in a real sentence, with per-blank hints.</td>
<td>Progress over time, JLPT coverage, and upcoming review load.</td>
</tr>
</table>

<img src="docs/assets/session.gif" alt="A full review session" width="820">

## The dictionary

[gokan-srs.com/dictionary](https://gokan-srs.com/dictionary/) is a free Japanese dictionary built from the same dataset. It is fully static, has no tracking, and works without JavaScript.

- 35,814 words with readings, meanings, JLPT levels, and example sentences
- 2,300 kanji with the vocabulary that uses each one
- 755 grammar points grouped into families of near-synonyms, so you can compare でも, しかし, and けれども side by side
- Every word in every example sentence links to its own entry

You do not need an account, and nothing is behind a signup wall.

## The dataset

[gokan-dataset](https://github.com/gokan-dev/gokan-dataset) is the open dataset both apps read, published as flat static JSON under CC BY-SA 4.0. It compiles JMDict, KKLC, JPDB frequency data, JLPT level lists, Tatoeba sentence pairs, and grammar points into one cross-linked structure, with per-file format documentation.

It is meant to be usable on its own. If you are building a Japanese learning tool and want vocabulary linked to kanji, frequency, JLPT level, and tokenized example sentences without assembling it yourself, take it.

## Getting started

```bash
git clone --recurse-submodules https://github.com/gokan-dev/gokan-srs.git
cd gokan-srs
bun install
bun run dev
```

If you already cloned without submodules, run `git submodule update --init --recursive` first: the dataset lives in a separate repository and the build reads from it.

Common commands:

```bash
bun run dev              # SRS app, with the dataset synced first
bun run test             # SRS app test suite
bun run typecheck        # SRS app types
bun run dictionary:dev   # dictionary, in dev mode
bun run dictionary:build # generate all ~38,900 static pages
```

Scope anything else to one workspace with `--cwd`, for example `bun run --cwd apps/gokan-dictionary test`.

## Repository layout

```
apps/
  gokan-srs/          React 19 SRS app. Reads the dataset as a git submodule.
  gokan-dictionary/   Svelte static site generator. One page per entry.
docs/                 Design system, roadmap, modification log.
```

The dataset is not vendored here. `apps/gokan-srs/dataset/` is a submodule pointing at [gokan-dataset](https://github.com/gokan-dev/gokan-dataset), and both apps build from that one checkout so they can never ship different versions of the same data.

| Layer | Choice |
|---|---|
| SRS app | React 19, TypeScript, Tailwind CSS v4 |
| Dictionary | Svelte 5, SCSS, build-time prerendering |
| Build | Vite (rolldown), Bun |
| Tests | Vitest |
| Hosting | S3 and CloudFront, provisioned with Terraform |

Architecture notes live in [CLAUDE.md](CLAUDE.md), the visual language in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## Credits

Built on the work of others, all of it free:

- [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html) by the Electronic Dictionary Research and Development Group, for dictionary entries and glosses
- [Tatoeba](https://tatoeba.org) for example sentences
- [KKLC](https://www.kanjialive.com) kanji ordering, via [ppasupat/vocab-kanji](https://github.com/ppasupat/vocab-kanji)
- [JPDB](https://jpdb.io) for frequency data
- [JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary), sourced from Jonathan Waller's tanos.co.uk
- [hanabira.org](https://hanabira.org) for grammar points

Licensing for the compiled data is documented in the [dataset repository](https://github.com/gokan-dev/gokan-dataset#license), since each upstream source carries its own terms.
