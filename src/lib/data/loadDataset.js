import { base } from '$app/paths';

let cached = null;

function fetchJson(fetchImpl, url) {
  return fetchImpl(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
    return r.json();
  });
}

export function loadDataset(fetchImpl = fetch) {
  if (!cached) {
    const promise = Promise.all([
      fetchJson(fetchImpl, `${base}/data/people.json`),
      fetchJson(fetchImpl, `${base}/data/families.json`),
      fetchJson(fetchImpl, `${base}/data/sources.json`)
    ]).then(([people, families, sources]) => ({ people, families, sources }));
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
