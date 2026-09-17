<script>
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { DEFAULT_PERSON_ID } from '$lib/config.js';

  const REDIRECT_DELAY_MS = 2000;
  const homeHref = `${base}/person/${DEFAULT_PERSON_ID}`;

  onMount(() => {
    const timer = setTimeout(() => goto(homeHref), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  });
</script>

<div class="error-page">
  <p>{page.error?.message ?? 'Something went wrong.'}</p>
  <p>Taking you back to search… <a href={homeHref}>Go now</a></p>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100dvh;
    gap: 0.5rem;
    text-align: center;
  }
</style>
