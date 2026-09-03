<script lang="ts">
  import type { GrammarPoint } from '../models/grammar.model';
  import type { GrammarSummary } from '../lib/types';
  import { grammarPath, homePath, vocabPath } from '../lib/urls';
  import SiteHeader from './SiteHeader.svelte';
  import SiteFooter from './SiteFooter.svelte';

  interface Props {
    point: GrammarPoint;
    related: GrammarSummary[];
  }

  let { point, related }: Props = $props();

  const FORMALITY_LABELS: Record<NonNullable<GrammarPoint['formalityLevel']>, string> = {
    casual: 'Casual',
    neutral: 'Neutral',
    polite: 'Polite',
    formal: 'Formal',
    'very-formal-literary': 'Very formal / literary',
  };
</script>

<SiteHeader />

<main>
  <div class="container">
    <p class="breadcrumb"><a href={homePath()}>Dictionary</a> / Grammar / <span class="jp">{point.title}</span></p>

    <h1>
      <span class="jp">{point.title}</span>
      <span class="badge">JLPT N{point.jlptLevel}</span>
      {#if point.formalityLevel}<span class="badge">{FORMALITY_LABELS[point.formalityLevel]}</span>{/if}
    </h1>

    {#if point.romaji}
      <p class="readings muted">{point.romaji}</p>
    {/if}

    <p>{point.shortExplanation}</p>

    {#if point.usageNote}
      <p class="muted">{point.usageNote}</p>
    {/if}

    <section class="card">
      <h2>Formation</h2>
      <p class="jp formation">{point.formation}</p>
    </section>

    {#if point.longExplanation && point.longExplanation !== point.shortExplanation}
      <section class="card">
        <h2>Explanation</h2>
        <p>{point.longExplanation}</p>
      </section>
    {/if}

    {#if point.examples.length > 0}
      <section class="card">
        <h2>Example sentences</h2>
        <ul class="sentence-list">
          {#each point.examples as example}
            <li class="sentence">
              <p class="sentence-original jp">
                <!--
                  Rendered word-by-word rather than as `example.jp` so every word the dataset
                  resolved to a vocab id becomes a link to its dictionary page. Concatenating
                  the surfaces reconstructs `jp` exactly (an invariant the dataset guarantees),
                  so this is a lossless swap that buys a large internal link graph: it is what
                  makes the ~36k vocab pages reachable by a crawler from grammar pages, instead
                  of only from kanji pages and the search box.
                -->
                {#each example.words as word}{#if word.vocabId}<a class="sentence-word" href={vocabPath(word.vocabId)}>{word.surface}</a>{:else}{word.surface}{/if}{/each}
              </p>
              <p class="sentence-en">{example.en}</p>
              {#if example.romaji}<p class="sentence-en muted">{example.romaji}</p>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if related.length > 0}
      <section class="card">
        <h2>{point.family?.name ?? 'Related points'}</h2>
        <ul class="vocab-list">
          {#each related as other}
            <li class="vocab-list-item">
              <a class="jp" href={grammarPath(other.id)}>{other.title}</a>
              <span class="muted">JLPT N{other.jlptLevel}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</main>

<SiteFooter />
