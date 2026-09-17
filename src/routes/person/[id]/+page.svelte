<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import TreeView from '$lib/components/TreeView.svelte';
  import PersonPanel from '$lib/components/PersonPanel.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import DepthPicker from '$lib/components/DepthPicker.svelte';
  import { buildSearchIndex } from '$lib/data/search.js';
  import { primaryName } from '$lib/data/formatDate.js';
  import { DEFAULT_PROGENY_DEPTH } from '$lib/config.js';

  let { data } = $props();

  let searchIndex = $derived(buildSearchIndex(data.model.peopleById));
  let person = $derived(data.model.peopleById.get(data.personId));
  let progenyDepth = $state(DEFAULT_PROGENY_DEPTH);
  let panelOpen = $state(true);

  function selectPerson(id) {
    goto(`${base}/person/${id}`);
  }
</script>

<svelte:head>
  <title>{person ? `${primaryName(person)} — Family Tree` : 'Family Tree'}</title>
</svelte:head>

<div class="layout">
  <div class="toolbar">
    <div class="toolbar-left">
      <a href={`${base}/`} class="app-icon" aria-label="Go to family tree home">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="4.4" r="2.4" />
          <circle cx="5" cy="18" r="2.4" />
          <circle cx="19" cy="18" r="2.4" />
          <path d="M12 6.8 V11 M5 11 H19 M5 11 V15.6 M19 11 V15.6" />
        </svg>
      </a>
      <SearchBox index={searchIndex} onSelect={selectPerson} />
    </div>
    <DepthPicker value={progenyDepth} onChange={(v) => (progenyDepth = v)} />
  </div>
  <div class="main">
    <TreeView
      data={data.model}
      centerId={data.personId}
      {progenyDepth}
      onSelectPerson={selectPerson}
    />

    <!-- Desktop: sidebar with a small floating corner toggle. -->
    {#if panelOpen}
      <div class="panel-wrap desktop-panel-wrap">
        <PersonPanel {person} model={data.model} />
      </div>
    {/if}
    <button
      type="button"
      class="panel-toggle desktop-panel-toggle"
      aria-expanded={panelOpen}
      aria-label={panelOpen ? 'Collapse details panel' : 'Expand details panel'}
      onclick={() => (panelOpen = !panelOpen)}
    >
      {panelOpen ? '▸' : '◂'}
    </button>

    <!-- Narrow: docked to the bottom. Collapsed shows just a name/header bar;
         expanded shows the panel with the toggle sitting on its own name row. -->
    <div class="mobile-panel-wrap">
      {#if panelOpen}
        <div class="mobile-panel-content">
          <button
            type="button"
            class="panel-toggle mobile-inline-toggle"
            aria-expanded={panelOpen}
            aria-label="Collapse details panel"
            onclick={() => (panelOpen = false)}
          >
            ▾
          </button>
          <PersonPanel {person} model={data.model} />
        </div>
      {:else}
        <button
          type="button"
          class="mobile-panel-header"
          aria-expanded={panelOpen}
          aria-label="Expand details panel"
          onclick={() => (panelOpen = true)}
        >
          <span class="mobile-panel-name">{person ? primaryName(person) : 'No selection'}</span>
          <span class="mobile-panel-arrow">▴</span>
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
  }
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }
  .app-icon {
    display: flex;
    flex-shrink: 0;
    color: var(--ink);
  }
  .app-icon:hover {
    color: var(--ink-dim);
  }
  .main {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .main :global(.tree-view) {
    flex: 1;
    min-width: 0;
  }
  .desktop-panel-wrap {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    background: var(--surface);
    border-left: 1px solid var(--rule);
  }
  /* flex + min-height:0 makes the panel's own height bounded by its
     container instead of just hugging its content, so overflow-y:auto
     actually scrolls the panel internally instead of growing past the
     container and scrolling the whole page. */
  .main :global(.person-panel) {
    width: 320px;
    max-width: 100%;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
    color: var(--ink);
  }
  .panel-toggle {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-dim);
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
  }
  .panel-toggle:hover {
    background: var(--bg);
    color: var(--ink);
  }
  /* Floats in the corner so it never adds width to the layout. */
  .desktop-panel-toggle {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 5;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .mobile-panel-wrap {
    display: none;
  }

  /* Below this width, stack the tree above the panel (docked to the bottom)
     so it doesn't crowd out the tree. Collapsed, only the header bar with
     the selected person's name shows; expanded, the full panel appears
     above it, both anchored to the same spot at the bottom. */
  @media (max-width: 720px) {
    .main {
      flex-direction: column;
    }
    .desktop-panel-wrap,
    .desktop-panel-toggle {
      display: none;
    }
    .main :global(.person-panel) {
      width: 100%;
    }
    .mobile-panel-wrap {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      max-height: 60vh;
      overflow: hidden;
      background: var(--surface);
      border-top: 1px solid var(--rule);
    }
    .mobile-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 1rem;
      border: none;
      background: none;
      color: var(--ink);
      font: inherit;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .mobile-panel-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mobile-panel-content {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    /* Sits right on the panel's own name row instead of a separate bar. */
    .mobile-inline-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 2;
    }
    /* Leaves room so a long name doesn't run under the toggle. */
    .mobile-panel-content :global(.person-panel h2) {
      padding-right: 2.25rem;
    }
  }
</style>
