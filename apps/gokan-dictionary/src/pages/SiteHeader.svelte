<script lang="ts">
  import { homePath } from '../lib/urls';
  import { SITE_TAGLINE } from '../lib/site';
</script>

<header class="site-header">
  <div class="container">
    <a class="site-title" href={homePath()}><span class="jp">語感</span> Dictionary</a>
    <span class="muted">{SITE_TAGLINE}</span>
  </div>
</header>
