<script lang="ts">
  import type { Vocabulary } from '../models/vocabulary.model';
  import type { Sentence } from '../models/sentence.model';
  import type { VocabSummary } from '../lib/types';
  import { homePath, kanjiPath, vocabPath } from '../lib/urls';
  import SiteHeader from './SiteHeader.svelte';
  import SiteFooter from './SiteFooter.svelte';

  interface Props {
    vocab: Vocabulary;
    components: VocabSummary[];
    parents: VocabSummary[];
    sentences: Sentence[];
  }

  let { vocab, components, parents, sentences }: Props = $props();

  function misc_labels(misc: Vocabulary['senses'][number]['misc']): string[] {
    const labels: string[] = [];
    if (misc.isAbbreviation) labels.push('abbreviation');
    if (misc.isPrefix) labels.push('prefix');
    if (misc.isSuffix) labels.push('suffix');
    if (misc.isArchaic) labels.push('archaic');
    if (misc.isRare) labels.push('rare');
    return labels;
  }
</script>

<SiteHeader />

<main>
  <div class="container">
    <p class="breadcrumb"><a href={homePath()}>Dictionary</a> / <span class="jp">{vocab.writtenForm.kanji}</span></p>

    <h1>
      <span class="jp">{vocab.writtenForm.kanji}</span>
      {#if vocab.jlptLevel}<span class="badge">JLPT N{vocab.jlptLevel}</span>{/if}
      {#if vocab.isCommon}<span class="badge">common</span>{/if}
    </h1>
    <p class="readings jp">
      {vocab.reading.primary}
      {#if vocab.reading.alternatives.length > 0}
        <span class="muted">&middot; also {vocab.reading.alternatives.join('、')}</span>
      {/if}
    </p>

    {#if vocab.writtenForm.alternatives.length > 0}
      <p class="muted jp">Also written {vocab.writtenForm.alternatives.join('、')}</p>
    {/if}

    <section class="card">
      <h2>Meanings</h2>
      <ol class="sense-list">
        {#each vocab.senses as sense}
          <li class="sense">
            <div class="pos-tags">
              {#each sense.pos as tag}<span class="pos-tag">{tag}</span>{/each}
              {#each misc_labels(sense.misc) as label}<span class="pos-tag">{label}</span>{/each}
            </div>
            <span>{sense.glosses.join('; ')}</span>
          </li>
        {/each}
      </ol>
    </section>

    {#if vocab.writtenForm.containedKanji.length > 0}
      <section class="card">
        <h2>Kanji</h2>
        <ul class="chip-list">
          {#each vocab.writtenForm.containedKanji as character}
            <li><a class="chip jp" href={kanjiPath(character)}>{character}</a></li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if components.length > 0}
      <section class="card">
        <h2>Made of</h2>
        <ul class="vocab-list">
          {#each components as related}
            <li class="vocab-list-item">
              <a class="jp" href={vocabPath(related.id)}>{related.kanji}</a>
              <span class="muted jp">{related.reading}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if parents.length > 0}
      <section class="card">
        <h2>Used in</h2>
        <ul class="vocab-list">
          {#each parents as related}
            <li class="vocab-list-item">
              <a class="jp" href={vocabPath(related.id)}>{related.kanji}</a>
              <span class="muted jp">{related.reading}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if sentences.length > 0}
      <section class="card">
        <h2>Example sentences</h2>
        <ul class="sentence-list">
          {#each sentences as sentence}
            <li class="sentence">
              <p class="sentence-original jp">{sentence.original}</p>
              {#if sentence.en[0]}<p class="sentence-en">{sentence.en[0].text}</p>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</main>

<SiteFooter />
