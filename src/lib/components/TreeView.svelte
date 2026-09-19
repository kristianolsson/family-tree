<script>
  import * as f3 from 'family-chart';
  import 'family-chart/styles/family-chart.css';
  import { toFamilyChartNodes } from './treeViewAdapter.js';

  let {
    data,
    centerId,
    progenyDepth = 'all',
    ancestryDepth = 'all',
    onSelectPerson,
    onExpandDepth
  } = $props();

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
      // The "+" goes only on boundary cards: an ancestor whose parents are
      // cut off by the depth limit (badge on top, where the parent line
      // would leave), or a non-spouse descendant whose children are cut off
      // (badge on bottom). family-chart has no per-branch depth, so the
      // "+" bumps the whole tree's up/down depth by one step.
      card.setOnCardUpdate(function (d) {
        const existingButton = this.querySelector('.depth-expand-btn');
        if (existingButton) existingButton.remove();
        if (d.data.to_add || d.data.unknown || d.data._new_rel_data) return;
        const displayed = new Set(chart.store.getTree().data.map((t) => t.data.id));
        const hidden = (ids) => (ids || []).some((id) => id && !displayed.has(id));
        let direction;
        if (d.is_ancestry) {
          if (hidden(d.data.rels.parents)) direction = 'up';
        } else if (!d.spouse && hidden(d.data.rels.children)) {
          direction = 'down';
        }
        if (!direction) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `depth-expand-btn ${direction}`;
        button.textContent = '+';
        button.setAttribute(
          'aria-label',
          direction === 'up' ? 'Show an earlier generation' : 'Show a later generation'
        );
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          onExpandDepth(direction);
        });
        this.querySelector('.card')?.appendChild(button);
      });
    }
    if (!centerId) return;
    chart.setProgenyDepth(progenyDepth === 'all' ? undefined : progenyDepth);
    chart.setAncestryDepth(ancestryDepth === 'all' ? undefined : ancestryDepth);
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
  /* Centered on a card's top (up) or bottom (down) edge -- .card itself is
     `position: relative` (family-chart's own CSS). */
  .tree-view :global(.depth-expand-btn) {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--accent);
    border-radius: 999px;
    background: var(--accent);
    color: var(--bg);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    z-index: 3;
  }
  .tree-view :global(.depth-expand-btn.up) {
    top: -11px;
  }
  .tree-view :global(.depth-expand-btn.down) {
    bottom: -11px;
  }
  .tree-view :global(.depth-expand-btn:hover) {
    filter: brightness(1.1);
  }
  @media (max-width: 720px) {
    .tree-view {
      min-height: 0;
    }
  }
</style>
