import { base } from '$app/paths';

let cached = null;

// Revalidate with the host on every load (a cheap 304 when unchanged), so an
// overwritten dataset shows up without a hard refresh even when the host sends
// no Cache-Control header and the browser would otherwise guess a freshness time.
const FETCH_OPTIONS = { cache: 'no-cache' };

function fetchJson(fetchImpl, url) {
  return fetchImpl(url, FETCH_OPTIONS).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
    return r.json();
  });
}

function fetchPlaces(fetchImpl) {
  return fetchImpl(`${base}/data/places.json`, FETCH_OPTIONS)
    .then((r) => (r.ok ? r.json() : {}))
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {}))
    .catch(() => ({}));
}

export function loadDataset(fetchImpl = fetch) {
  if (!cached) {
    const promise = Promise.all([
      fetchJson(fetchImpl, `${base}/data/people.json`),
      fetchJson(fetchImpl, `${base}/data/families.json`),
      fetchJson(fetchImpl, `${base}/data/sources.json`),
      fetchPlaces(fetchImpl)
    ]).then(([people, families, sources, places]) => ({
      people,
      families,
      sources,
      places
    }));
    promise.catch(() => {
      cached = null;
    });
    cached = promise;
  }
  return cached;
}

export function resetDatasetCache() {
  cached = null;
}
