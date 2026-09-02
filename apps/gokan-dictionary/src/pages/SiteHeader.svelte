<script lang="ts">
  import { grammarIndexPath, homePath, kanjiIndexPath, vocabIndexPath } from '../lib/urls';
</script>

<header class="site-header">
  <div class="container site-header-inner">
    <a class="site-title" href={homePath()}><span class="jp">語感</span> Dictionary</a>

    <!--
      The search box lives in the shared header rather than only on the home page, mirroring
      gokan-srs's own always-available SearchBar: looking a word up is the entire purpose of
      this site, so it should never cost a trip back to the home page. It is the only reason
      every page links the search script; the ~3MB index is still fetched lazily on first
      focus, so pages that are never searched from pay nothing for it.
    -->
    <div class="site-search" data-search>
      <label class="visually-hidden" for="site-search-input">Search vocabulary</label>
      <input
        id="site-search-input"
        class="search-input"
        type="search"
        placeholder="Search kanji, reading, or meaning..."
        autocomplete="off"
        role="combobox"
        aria-expanded="false"
        aria-controls="site-search-results"
        aria-autocomplete="list"
        data-search-input
      />
      <div class="search-panel" data-search-panel hidden>
        <p class="search-status" aria-live="polite" data-search-status></p>
        <ul class="search-results" id="site-search-results" role="listbox" data-search-results></ul>
      </div>
    </div>

    <nav class="site-nav">
      <a href={vocabIndexPath()}>Vocabulary</a>
      <a href={kanjiIndexPath()}>Kanji</a>
      <a href={grammarIndexPath()}>Grammar</a>
    </nav>
  </div>
</header>
