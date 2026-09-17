import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadDataset, resetDatasetCache } from '../../../src/lib/data/loadDataset.js';

beforeEach(() => resetDatasetCache());

function jsonResponse(body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

describe('loadDataset', () => {
  it('fetches and combines all three dataset files', async () => {
    const fetchMock = vi.fn((url) => {
      if (url === '/data/people.json') return jsonResponse([{ id: 'P1' }]);
      if (url === '/data/families.json') return jsonResponse([{ id: 'F1' }]);
      if (url === '/data/sources.json') return jsonResponse([{ id: 'S1' }]);
      throw new Error(`unexpected url ${url}`);
    });

    const result = await loadDataset(fetchMock);

    expect(result).toEqual({
      people: [{ id: 'P1' }],
      families: [{ id: 'F1' }],
      sources: [{ id: 'S1' }]
    });
  });

  it('only fetches once even when called multiple times', async () => {
    const fetchMock = vi.fn(() => jsonResponse([]));

    await loadDataset(fetchMock);
    await loadDataset(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
