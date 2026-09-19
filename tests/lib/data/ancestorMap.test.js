import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { collectAncestors, buildHeatData } from '../../../src/lib/data/ancestorMap.js';

const person = (id, place) => ({
  id,
  names: [{ value: id, type: 'birth', source_id: null }],
  birth: { date: null, year: null, place, source_id: null }
});

function model(people, families) {
  return buildFamilyTreeModel({ people, families, sources: [] });
}

describe('collectAncestors', () => {
  const people = ['A', 'B', 'C', 'D', 'E'].map((id) => person(id, null));
  // E child of (C,D); C child of (A,B)
  const families = [
    { id: 'F1', partners: ['A', 'B'], children: ['C'] },
    { id: 'F2', partners: ['C', 'D'], children: ['E'] }
  ];

  it('walks all the way up and excludes the person', () => {
    expect(collectAncestors(model(people, families), 'E').sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns nothing when there are no parents', () => {
    expect(collectAncestors(model(people, families), 'A')).toEqual([]);
  });

  it('ignores null partners', () => {
    const fams = [{ id: 'F1', partners: ['A', null], children: ['C'] }];
    expect(collectAncestors(model(people, fams), 'C').sort()).toEqual(['A']);
  });

  it('is cycle-safe', () => {
    const fams = [
      { id: 'F1', partners: ['A'], children: ['B'] },
      { id: 'F2', partners: ['B'], children: ['A'] }
    ];
    expect(collectAncestors(model(people, fams), 'A').sort()).toEqual(['B']);
  });
});

describe('buildHeatData', () => {
  const people = [person('A', 'X, Land'), person('B', 'X, Land'), person('C', 'Y, Land'), person('D', 'Nowhere'), person('E', null)];
  const m = model(people, []);
  const places = {
    'X, Land': { lat: 1, lng: 2, status: 'auto' },
    'Y, Land': { lat: 3, lng: 4, status: 'manual' },
    Nowhere: { lat: null, lng: null, status: 'unresolved' }
  };

  it('groups by place with counts and skips unresolved/missing', () => {
    const r = buildHeatData(m, ['A', 'B', 'C', 'D', 'E'], places);
    expect(r.total).toBe(5);
    expect(r.placed).toBe(3);
    expect(r.groups).toEqual([
      { place: 'X, Land', lat: 1, lng: 2, count: 2 },
      { place: 'Y, Land', lat: 3, lng: 4, count: 1 }
    ]);
  });

  it('trims place strings before lookup (matches the geocode script keys)', () => {
    const r = buildHeatData(model([person('A', ' X, Land ')], []), ['A'], places);
    expect(r.placed).toBe(1);
  });

  it('handles an empty places map', () => {
    const r = buildHeatData(m, ['A'], {});
    expect(r).toEqual({ total: 1, placed: 0, groups: [] });
  });
});
