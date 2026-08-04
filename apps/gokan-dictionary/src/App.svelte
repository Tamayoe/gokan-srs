<main>
  <h1>語感 Dictionary</h1>
  <p>
    This app has no client-side router or SPA in production - the real
    kanji/vocab dictionary pages are static HTML generated at build time by
    <code>scripts/prerender.ts</code>. This dev-server view exists only so
    <code>vite</code> has an entry point to serve while iterating.
  </p>
  <p>
    To see the actual generated pages, run:
  </p>
  <pre>bun run build &amp;&amp; bun run preview</pre>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    max-width: 640px;
    margin: 4rem auto;
    padding: 0 1rem;
  }
</style>
