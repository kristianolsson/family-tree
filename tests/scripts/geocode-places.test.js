// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { collectBirthPlaces, nominatimLookup, geocodePlaces } from '../../scripts/geocode-places.mjs';

const p = (place) => ({ birth: { place } });

describe('collectBirthPlaces', () => {
  it('returns unique non-empty trimmed places', () => {
    expect(collectBirthPlaces([p('A'), p(' A '), p(null), p(''), { birth: null }, p('B')])).toEqual(['A', 'B']);
  });
});

describe('nominatimLookup', () => {
  it('returns numeric lat/lng from the first result and sends a User-Agent', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [{ lat: '59.3', lon: '18.1' }] }));
    expect(await nominatimLookup('Stockholm', fetchImpl)).toEqual({ lat: 59.3, lng: 18.1 });
    const [url, opts] = fetchImpl.mock.calls[0];
    expect(url).toContain('q=Stockholm');
    expect(opts.headers['User-Agent']).toBeTruthy();
  });
  it('returns null when there are no results', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => [] });
    expect(await nominatimLookup('Nowhere', fetchImpl)).toBeNull();
  });
  it('throws on a non-ok response', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503 });
    await expect(nominatimLookup('X', fetchImpl)).rejects.toThrow('503');
  });
});

describe('geocodePlaces', () => {
  const sleep = async () => {};
  it('skips cached places and keeps manual entries', async () => {
    const lookup = vi.fn(async () => ({ lat: 1, lng: 2 }));
    const places = { A: { lat: 9, lng: 9, status: 'manual' }, B: { lat: 5, lng: 5, status: 'auto' } };
    const r = await geocodePlaces({ people: [p('A'), p('B'), p('C')], places, lookup, sleep });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(r.places.A).toEqual({ lat: 9, lng: 9, status: 'manual' });
    expect(r.places.C).toEqual({ lat: 1, lng: 2, status: 'auto' });
    expect(r.unresolved).toEqual([]);
  });
  it('marks misses unresolved and reports them', async () => {
    const r = await geocodePlaces({ people: [p('Z')], places: {}, lookup: async () => null, sleep });
    expect(r.places.Z).toEqual({ lat: null, lng: null, status: 'unresolved' });
    expect(r.unresolved).toEqual(['Z']);
  });
  it('retries unresolved only with retry, never manual', async () => {
    const places = { Z: { lat: null, lng: null, status: 'unresolved' } };
    const lookup = vi.fn(async () => ({ lat: 3, lng: 4 }));
    await geocodePlaces({ people: [p('Z')], places, lookup, sleep });
    expect(lookup).not.toHaveBeenCalled();
    const r = await geocodePlaces({ people: [p('Z')], places, lookup, retry: true, sleep });
    expect(r.places.Z.status).toBe('auto');
  });
  it('reports still-unresolved cached places', async () => {
    const places = { Z: { lat: null, lng: null, status: 'unresolved' } };
    const r = await geocodePlaces({ people: [p('Z')], places, lookup: async () => null, sleep });
    expect(r.unresolved).toEqual(['Z']);
  });
  it('treats a lookup error as unresolved without aborting', async () => {
    const lookup = async (place) => {
      if (place === 'A') throw new Error('boom');
      return { lat: 1, lng: 2 };
    };
    const r = await geocodePlaces({ people: [p('A'), p('B')], places: {}, lookup, sleep });
    expect(r.places.A.status).toBe('unresolved');
    expect(r.places.B.status).toBe('auto');
  });
});
