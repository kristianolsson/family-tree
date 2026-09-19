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
      if (url === '/data/places.json') return jsonResponse({ 'A, B': { lat: 1, lng: 2, status: 'auto' } });
      throw new Error(`unexpected url ${url}`);
    });

    const result = await loadDataset(fetchMock);

    expect(result).toEqual({
      people: [{ id: 'P1' }],
      families: [{ id: 'F1' }],
      sources: [{ id: 'S1' }],
      places: { 'A, B': { lat: 1, lng: 2, status: 'auto' } }
    });
  });

  it('only fetches once even when called multiple times', async () => {
    const fetchMock = vi.fn(() => jsonResponse([]));

    await loadDataset(fetchMock);
    await loadDataset(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  function withPlaces(placesImpl) {
    return vi.fn((url) => {
      if (url === '/data/places.json') return placesImpl();
      return jsonResponse([]);
    });
  }

  it('yields empty places when places.json is 404', async () => {
    const result = await loadDataset(withPlaces(() => Promise.resolve({ ok: false, status: 404 })));
    expect(result.places).toEqual({});
  });

  it('yields empty places when the places fetch rejects', async () => {
    const result = await loadDataset(withPlaces(() => Promise.reject(new Error('network'))));
    expect(result.places).toEqual({});
  });

  it('yields empty places when places.json is an array', async () => {
    const result = await loadDataset(withPlaces(() => jsonResponse([])));
    expect(result.places).toEqual({});
  });
});
