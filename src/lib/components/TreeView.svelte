<script>
  import * as f3 from 'family-chart';
  import 'family-chart/styles/family-chart.css';
  import { toFamilyChartNodes } from './treeViewAdapter.js';

  let { data, centerId, progenyDepth = 'all', onSelectPerson } = $props();

  let container;
  let chart;
  let hasRendered = false;

  $effect(() => {
    if (!container) return;
    if (!chart) {
      const nodes = toFamilyChartNodes(data);
      chart = f3.createChart(container, nodes);
      chart.setSingleParentEmptyCard(true, { label: 'Unknown' });
      const card = chart.setCardHtml();
      card.setCardDisplay([['first name', 'last name'], ['birthday']]);
      card.setOnCardClick((_e, d) => onSelectPerson(d.data.id));
    }
    if (!centerId) return;
    chart.setProgenyDepth(progenyDepth === 'all' ? undefined : progenyDepth);
    chart.updateMainId(centerId);
    chart.updateTree({ initial: !hasRendered });
    hasRendered = true;
  });
</script>

<div class="f3 tree-view" bind:this={container}></div>

<style>
  .tree-view {
    width: 100%;
    height: 100%;
    min-height: 600px;
    /* Below this width the page stacks the tree above a bottom detail
       panel (see person/[id]/+page.svelte); a fixed min-height here
       fights that layout, forcing the two together past the viewport
       height and scrolling the whole page instead of just the panel. */
    background: var(--surface);
    color: var(--ink);
    --background-color: var(--surface);
    --text-color: var(--ink);
    --female-color: #c69295;
    --male-color: #8aa1b4;
    --genderless-color: #a39b8f;
    /* Cards are tap targets, not text -- without this, a tap-and-drag on
       mobile (easy to trigger while panning) selects the card's text and
       Chrome/Safari pop up a "search"/"copy" bubble over it. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  /* family-chart draws card fills and connector lines with its own
     defaults (bright pink/blue on near-black); these override its own
     CSS variables and element classes to use our palette instead, with
     AA-contrast-checked fill colors (>=4.5:1 against --ink) plus a
     matching darker border so cards read clearly against --surface. */
  .tree-view :global(.card-female .card-inner) {
    border: 1px solid #956b6e;
  }
  .tree-view :global(.card-male .card-inner) {
    border: 1px solid #677887;
  }
  .tree-view :global(.card-genderless .card-inner) {
    border: 1px solid var(--ink-dim);
  }
  .tree-view :global(.link) {
    stroke: var(--ink-dim);
  }
  @media (max-width: 720px) {
    .tree-view {
      min-height: 0;
    }
  }
</style>
