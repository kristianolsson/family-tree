import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { collectAncestors, buildHeatData, markerRadius, clusterGroups } from '../../../src/lib/data/ancestorMap.js';

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
      {
        lat: 1,
        lng: 2,
        count: 2,
        places: [{ place: 'X, Land', count: 2 }],
        people: [
          { id: 'A', name: 'A', year: null, place: 'X, Land' },
          { id: 'B', name: 'B', year: null, place: 'X, Land' }
        ]
      },
      {
        lat: 3,
        lng: 4,
        count: 1,
        places: [{ place: 'Y, Land', count: 1 }],
        people: [{ id: 'C', name: 'C', year: null, place: 'Y, Land' }]
      }
    ]);
  });

  it('merges places pinned at identical coordinates into one group, busiest first', () => {
    const shared = { lat: 5, lng: 6, status: 'auto' };
    const ppl = [person('A', 'P1'), person('B', 'P2'), person('C', 'P2'), person('D', 'P3')];
    const r = buildHeatData(model(ppl, []), ['A', 'B', 'C', 'D'], {
      P1: shared,
      P2: { ...shared },
      P3: { lat: 7, lng: 8, status: 'auto' }
    });
    expect(r.placed).toBe(4);
    expect(r.groups.map(({ people, ...g }) => g)).toEqual([
      {
        lat: 5,
        lng: 6,
        count: 3,
        places: [
          { place: 'P2', count: 2 },
          { place: 'P1', count: 1 }
        ]
      },
      { lat: 7, lng: 8, count: 1, places: [{ place: 'P3', count: 1 }] }
    ]);
    expect(r.groups[0].people.map((p) => p.id)).toEqual(['A', 'B', 'C']);
  });

  it('trims place strings before lookup (matches the geocode script keys)', () => {
    const r = buildHeatData(model([person('A', ' X, Land ')], []), ['A'], places);
    expect(r.placed).toBe(1);
  });

  it('lists each group\'s people oldest first, undated last, with name, year and place', () => {
    const born = (id, name, birth) => ({
      id,
      names: [{ value: name, type: 'birth', source_id: null }],
      birth: { place: 'X, Land', source_id: null, date: null, year: null, ...birth }
    });
    const ppl = [
      born('A', 'Undated', {}),
      born('B', 'Bertil', { year: '1850' }),
      born('C', 'Anna', { date: '1850-03-01' }),
      born('D', 'Olof', { year: 1700 })
    ];
    const r = buildHeatData(model(ppl, []), ['A', 'B', 'C', 'D'], places);
    expect(r.groups[0].people).toEqual([
      { id: 'D', name: 'Olof', year: '1700', place: 'X, Land' },
      { id: 'C', name: 'Anna', year: '1850', place: 'X, Land' },
      { id: 'B', name: 'Bertil', year: '1850', place: 'X, Land' },
      { id: 'A', name: 'Undated', year: null, place: 'X, Land' }
    ]);
  });

  it('handles an empty places map', () => {
    const r = buildHeatData(m, ['A'], {});
    expect(r).toEqual({ total: 1, placed: 0, groups: [] });
  });
});

describe('markerRadius', () => {
  it('grows with the count, so busier places look bigger', () => {
    expect(markerRadius(1)).toBe(9);
    expect(markerRadius(2)).toBeGreaterThan(markerRadius(1));
    expect(markerRadius(23)).toBeGreaterThan(markerRadius(2) * 2);
  });
  it('is capped', () => {
    expect(markerRadius(10000)).toBe(30);
  });
});

describe('clusterGroups', () => {
  // Identity projection: treat lat/lng as screen pixels.
  const project = (lat, lng) => ({ x: lng, y: lat });
  const g = (lat, lng, place, ids) => ({
    lat,
    lng,
    count: ids.length,
    places: [{ place, count: ids.length }],
    people: ids.map(([id, year]) => ({ id, name: id, year, place }))
  });

  it('merges groups within the distance into the busiest one, combining places and people', () => {
    const big = g(0, 0, 'Parish', [['A', '1700'], ['B', '1800']]);
    const near = g(0, 10, 'Village', [['C', '1750']]);
    const far = g(0, 100, 'Elsewhere', [['D', null]]);
    const r = clusterGroups([near, far, big], project, 24);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      lat: 0,
      lng: 0,
      count: 3,
      places: [
        { place: 'Parish', count: 2 },
        { place: 'Village', count: 1 }
      ],
      people: [
        { id: 'A', name: 'A', year: '1700', place: 'Parish' },
        { id: 'C', name: 'C', year: '1750', place: 'Village' },
        { id: 'B', name: 'B', year: '1800', place: 'Parish' }
      ]
    });
    expect(r[1]).toBe(far);
  });

  it('does not chain: a group near a member but far from the anchor stays separate', () => {
    const anchor = g(0, 0, 'A', [['A', null], ['A2', null]]);
    const middle = g(0, 20, 'B', [['B', null]]);
    const end = g(0, 40, 'C', [['C', null]]);
    const r = clusterGroups([anchor, middle, end], project, 24);
    expect(r.map((c) => c.count)).toEqual([2 + 1, 1]);
    expect(r[1]).toBe(end);
  });

  it('leaves groups alone when nothing is close', () => {
    const a = g(0, 0, 'A', [['A', null]]);
    const b = g(0, 50, 'B', [['B', null]]);
    expect(clusterGroups([a, b], project, 24)).toEqual([a, b]);
  });
});
