import { describe, expect, it, vi, beforeEach } from 'vitest';
import { load } from '../../../src/routes/person/[id]/+page.js';
import { resetDatasetCache } from '../../../src/lib/data/loadDataset.js';
import { people, families, sources } from '../../fixtures/sampleDataset.js';

beforeEach(() => resetDatasetCache());

function makeFetch() {
  return vi.fn((url) => {
    const body = url.includes('places')
      ? {}
      : url.includes('people')
      ? people : url.includes('families') ? families : sources;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
}

describe('[id] load', () => {
  it('builds the model and returns it with the requested person id', async () => {
    const result = await load({ params: { id: 'P1' }, fetch: makeFetch() });
    expect(result.personId).toBe('P1');
    expect(result.places).toEqual({});
    expect(result.model.peopleById.get('P1').names[0].value).toBe('Anders Eriksson');
  });

  it('404s for an unknown person id', async () => {
    await expect(load({ params: { id: 'P999' }, fetch: makeFetch() })).rejects.toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });
});
