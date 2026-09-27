import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';

// A minimal stand-in for family-chart's chainable chart API, recording the
// calls TreeView makes so we can check what it asks the library for.
const chart = vi.hoisted(() => {
  const card = {
    setCardDisplay: vi.fn(),
    setOnCardClick: vi.fn(),
    setOnCardUpdate: vi.fn()
  };
  return {
    setSingleParentEmptyCard: vi.fn(),
    setCardHtml: vi.fn(() => card),
    setProgenyDepth: vi.fn(),
    setAncestryDepth: vi.fn(),
    setDuplicateBranchToggle: vi.fn(),
    updateMainId: vi.fn(),
    updateTree: vi.fn()
  };
});
vi.mock('family-chart', () => ({ createChart: vi.fn(() => chart) }));
vi.mock('family-chart/styles/family-chart.css', () => ({}));

import TreeView from '../../../src/lib/components/TreeView.svelte';

const person = (id) => ({ id, names: [{ value: id, type: 'birth', source_id: null }] });
const model = buildFamilyTreeModel({
  people: [person('A'), person('B'), person('C')],
  families: [{ id: 'F1', partners: ['A', 'B'], children: ['C'] }],
  sources: []
});
const props = (extra = {}) => ({
  data: model,
  centerId: 'C',
  onSelectPerson: vi.fn(),
  onExpandDepth: vi.fn(),
  ...extra
});

describe('TreeView repeated-ancestor collapsing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('leaves repeated branches expanded by default', () => {
    render(TreeView, { props: props() });
    expect(chart.setDuplicateBranchToggle).toHaveBeenLastCalledWith(false);
  });

  it('turns on family-chart duplicate-branch collapsing when asked', () => {
    render(TreeView, { props: props({ collapseRepeats: true }) });
    expect(chart.setDuplicateBranchToggle).toHaveBeenLastCalledWith(true);
  });

  it('re-renders the tree when the setting changes', async () => {
    const { rerender } = render(TreeView, { props: props() });
    const renders = chart.updateTree.mock.calls.length;
    await rerender(props({ collapseRepeats: true }));
    await tick();
    expect(chart.setDuplicateBranchToggle).toHaveBeenLastCalledWith(true);
    expect(chart.updateTree.mock.calls.length).toBeGreaterThan(renders);
  });
});
