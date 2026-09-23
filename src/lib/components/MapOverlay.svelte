<script>
  import MapView from './MapView.svelte';
  import { collectAncestors, buildHeatData } from '$lib/data/ancestorMap.js';

  let { model, personId, places, onClose } = $props();

  // 'ancestors' = the selected person's ancestry; 'everyone' = every person in the tree.
  let scope = $state('ancestors');
  let ids = $derived(scope === 'everyone' ? [...model.peopleById.keys()] : collectAncestors(model, personId));
  let heat = $derived(buildHeatData(model, ids, places));
  let noun = $derived(scope === 'everyone' ? 'people' : 'ancestors');
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<div class="map-overlay" role="dialog" aria-modal="true" aria-label="Birthplace map">
  <header class="map-header">
    <h2>Where {noun} were born</h2>
    <div class="map-scope" role="group" aria-label="Who to show">
      <button type="button" aria-pressed={scope === 'ancestors'} onclick={() => (scope = 'ancestors')}>
        Ancestors
      </button>
      <button type="button" aria-pressed={scope === 'everyone'} onclick={() => (scope = 'everyone')}>
        Everyone
      </button>
    </div>
    <span class="map-note">{heat.placed} of {heat.total} {noun} placed</span>
    <button type="button" class="map-close" aria-label="Close map" onclick={() => onClose()}>
      ✕
    </button>
  </header>
  <div class="map-body">
    {#if heat.total === 0}
      <p class="map-empty">No known ancestors for this person.</p>
    {:else if heat.placed === 0}
      <p class="map-empty">No birthplaces with coordinates yet — run <code>npm run geocode</code>.</p>
    {:else}
      <!-- MapView builds its layers once on mount, so remount it when the scope changes. -->
      {#key scope}
        <MapView groups={heat.groups} {noun} />
      {/key}
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
  .map-scope {
    display: flex;
    border: 1px solid var(--rule);
    border-radius: 999px;
    overflow: hidden;
  }
  .map-scope button {
    padding: 0.25rem 0.75rem;
    border: 0;
    background: var(--surface);
    color: var(--ink-dim);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .map-scope button + button {
    border-left: 1px solid var(--rule);
  }
  .map-scope button:hover {
    background: var(--bg);
    color: var(--ink);
  }
  .map-scope button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--surface);
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
