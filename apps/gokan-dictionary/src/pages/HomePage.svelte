<script lang="ts">
  import { SITE_DESCRIPTION } from '../lib/site';
  import { grammarIndexPath } from '../lib/urls';
  import SiteHeader from './SiteHeader.svelte';
  import SiteFooter from './SiteFooter.svelte';

  interface Props {
    vocabCount: number;
    kanjiCount: number;
    grammarCount: number;
  }

  let { vocabCount, kanjiCount, grammarCount }: Props = $props();
</script>

<SiteHeader />

<main>
  <div class="container">
    <div class="hero">
      <h1><span class="jp">語感</span> Dictionary</h1>
      <p>{SITE_DESCRIPTION}</p>
    </div>

    <div class="search-box">
      <label for="search-input" class="visually-hidden">Search kanji or vocabulary</label>
      <input
        id="search-input"
        class="search-input"
        type="search"
        placeholder="Search by kanji, reading, or English meaning..."
        autocomplete="off"
        data-search-input
      />
      <p class="search-status" id="search-status" aria-live="polite" data-search-status></p>
      <ul class="search-results" id="search-results" data-search-results></ul>
    </div>

    <p class="stat-row">
      <span>{vocabCount.toLocaleString()} vocabulary entries</span>
      <span>{kanjiCount.toLocaleString()} kanji</span>
      <span><a href={grammarIndexPath()}>{grammarCount.toLocaleString()} grammar points</a></span>
    </p>
  </div>
</main>

<SiteFooter />
