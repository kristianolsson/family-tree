import { base } from '$app/paths';

let cached = null;

function fetchJson(fetchImpl, url) {
  return fetchImpl(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
    return r.json();
  });
}

function fetchPlaces(fetchImpl) {
  return fetchImpl(`${base}/data/places.json`)
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
