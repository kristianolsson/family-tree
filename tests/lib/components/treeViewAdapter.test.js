import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { toFamilyChartNodes, linkGroupKey } from '../../../src/lib/components/treeViewAdapter.js';
import { people, families, sources } from '../../fixtures/sampleDataset.js';

describe('toFamilyChartNodes', () => {
  const model = buildFamilyTreeModel({ people, families, sources });
  const nodes = toFamilyChartNodes(model);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  it('splits the primary name into first/last and sets gender from sex', () => {
    const p1 = byId.get('P1');
    expect(p1.data['first name']).toBe('Anders');
    expect(p1.data['last name']).toBe('Eriksson');
    expect(p1.data.gender).toBe('M');
    expect(p1.data.birthday).toBe('1851-04-02');
  });

  it('lists every spouse and child across a remarried person’s families', () => {
    const p1 = byId.get('P1');
    expect(p1.rels.spouses.sort()).toEqual(['P2', 'P6']);
    expect(p1.rels.children.sort()).toEqual(['P3', 'P5']);
  });

  it('sets parents from the one family a person is a child in', () => {
    const p3 = byId.get('P3');
    expect(p3.rels.parents).toEqual(['P1', 'P2']);
  });

  it('omits spouses/children keys when a person’s own family has a null partner and no kids', () => {
    const p3 = byId.get('P3');
    expect(p3.rels.spouses).toBeUndefined();
    expect(p3.rels.children).toBeUndefined();
  });

  it('has an empty rels object for someone with no known family links', () => {
    const p4 = byId.get('P4');
    expect(p4.rels).toEqual({});
  });

  it('omits the gender key entirely when sex is null, rather than guessing', () => {
    const p7 = byId.get('P7');
    expect(p7.data.gender).toBeUndefined();
  });
});

describe('linkGroupKey', () => {
  const a = { tid: 'a' };
  const b = { tid: 'b' };
  const kid = { tid: 'k' };

  it('gives a couple’s spouse line and child lines the same key', () => {
    const spouse = { spouse: true, source: a, target: b };
    const down = { source: [b, a], target: kid };
    const up = { source: kid, target: [a, b] };
    expect(linkGroupKey(down)).toBe(linkGroupKey(spouse));
    expect(linkGroupKey(up)).toBe(linkGroupKey(spouse));
  });

  it('handles a single parent', () => {
    expect(linkGroupKey({ source: [a, a], target: kid })).toBe('a');
  });
});
