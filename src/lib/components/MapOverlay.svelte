<script>
  import MapView from './MapView.svelte';
  import { collectAncestors, buildHeatData } from '$lib/data/ancestorMap.js';

  let { model, personId, places, onClose } = $props();

  let heat = $derived(buildHeatData(model, collectAncestors(model, personId), places));
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="map-overlay" role="dialog" aria-modal="true" aria-label="Ancestor birthplace map">
  <header class="map-header">
    <h2>Where ancestors were born</h2>
    <span class="map-note">{heat.placed} of {heat.total} ancestors placed</span>
    <button type="button" class="map-close" aria-label="Close map" onclick={() => onClose()}>
      ✕
    </button>
  </header>
  <div class="map-body">
    {#if heat.placed === 0}
      <p class="map-empty">No birthplaces with coordinates yet — run <code>npm run geocode</code>.</p>
    {:else}
      <MapView groups={heat.groups} />
    {/if}
  </div>
</div>

<style>
  .map-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    color: var(--ink);
  }
  .map-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--rule);
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .map-note {
    flex: 1;
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .map-close {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-dim);
    cursor: pointer;
  }
  .map-close:hover {
    background: var(--bg);
    color: var(--ink);
  }
  .map-body {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .map-empty {
    padding: 1rem;
    color: var(--ink-dim);
  }
</style>
