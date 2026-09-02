<script lang="ts">
  import type { GrammarSummary } from '../lib/types';
  import { grammarPath, homePath } from '../lib/urls';
  import SiteHeader from './SiteHeader.svelte';
  import SiteFooter from './SiteFooter.svelte';

  interface Props {
    /** Levels in presentation order (N5 first), each with its points in dataset order. */
    levels: { level: number; points: GrammarSummary[] }[];
  }

  let { levels }: Props = $props();

  const total = $derived(levels.reduce((sum, group) => sum + group.points.length, 0));
</script>

<SiteHeader />

<main>
  <div class="container">
    <p class="breadcrumb"><a href={homePath()}>Dictionary</a> / Grammar</p>

    <div class="hero">
      <h1>Japanese Grammar Points</h1>
      <p>{total.toLocaleString()} grammar points, from JLPT N5 to N1.</p>
    </div>

    <!--
      Every grammar page is linked from here, so a crawler reaches all of them at depth 2 from
      the site root rather than only through the sitemap. Orphan pages (in the sitemap but
      linked from nowhere) are consistently indexed worse, which is the whole reason this index
      exists as its own page instead of the home page carrying 755 links.
    -->
    {#each levels as group}
      <section class="card">
        <h2 id={`n${group.level}`}>JLPT N{group.level} <span class="muted">({group.points.length})</span></h2>
        <ul class="vocab-list">
          {#each group.points as point}
            <li class="vocab-list-item">
              <a class="jp" href={grammarPath(point.id)}>{point.title}</a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</main>

<SiteFooter />
