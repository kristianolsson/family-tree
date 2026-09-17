import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { buildSearchIndex, searchPeople } from '../../../src/lib/data/search.js';
import { people, families, sources } from '../../fixtures/sampleDataset.js';

describe('search', () => {
  const model = buildFamilyTreeModel({ people, families, sources });
  const index = buildSearchIndex(model.peopleById);

  it('labels each entry with the primary name and birth year', () => {
    const p1 = index.find((e) => e.id === 'P1');
    expect(p1.label).toBe('Anders Eriksson (b. 1851)');
  });

  it('shows "unknown" in the label when birth info is missing entirely', () => {
    const p7 = index.find((e) => e.id === 'P7');
    expect(p7.label).toBe('Unknown Sex Person (b. unknown)');
  });

  it('finds both same-named people and lets their labels disambiguate them', () => {
    const results = searchPeople(index, 'per eriksson');
    const ids = results.map((r) => r.id).sort();
    expect(ids).toEqual(['P3', 'P4']);
    expect(results.find((r) => r.id === 'P3').label).toBe('Per Eriksson (b. 1979)');
    expect(results.find((r) => r.id === 'P4').label).toBe('Per Eriksson (b. 1976)');
  });

  it('matches case-insensitively on a partial name', () => {
    const results = searchPeople(index, 'ANDE');
    expect(results.map((r) => r.id)).toEqual(['P1']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchPeople(index, '   ')).toEqual([]);
  });
});
