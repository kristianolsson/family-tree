import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const USER_AGENT = 'family-tree-template geocode script (https://github.com/kristianolsson/family-tree)';
const DELAY_MS = 1100; // Nominatim usage policy: max 1 request/second

export function collectBirthPlaces(people) {
  const seen = new Set();
  for (const person of people) {
    const place = person.birth?.place?.trim();
    if (place) seen.add(place);
  }
  return [...seen];
}

export async function nominatimLookup(place, fetchImpl = fetch, countryCodes = null) {
  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  if (countryCodes) url += `&countrycodes=${encodeURIComponent(countryCodes)}`;
  const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status} for "${place}"`);
  const results = await response.json();
  if (!results.length) return null;
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// With countryCodes set, search those countries first and fall back to a
// worldwide search, so a bare "Husum" lands in the configured country rather
// than wherever Nominatim ranks highest, but "Honolulu, Hawaii, USA" still resolves.
export async function countryFirstLookup(place, countryCodes, { fetchImpl = fetch, sleep = defaultSleep } = {}) {
  if (!countryCodes) return nominatimLookup(place, fetchImpl);
  const local = await nominatimLookup(place, fetchImpl, countryCodes);
  if (local) return local;
  await sleep(DELAY_MS);
  return nominatimLookup(place, fetchImpl);
}

export async function geocodePlaces({ people, places, lookup, retry = false, sleep = defaultSleep }) {
  const result = { ...places };
  const unresolved = [];
  let firstRequest = true;
  for (const place of collectBirthPlaces(people)) {
    const existing = result[place];
    const needsLookup = !existing || (existing.status === 'unresolved' && retry);
    if (!needsLookup) {
      if (existing.status === 'unresolved') unresolved.push(place);
      continue;
    }
    if (!firstRequest) await sleep(DELAY_MS);
    firstRequest = false;
    let coords = null;
    try {
      coords = await lookup(place);
    } catch (err) {
      // Transient failure: leave the place uncached so the next run retries it.
      console.warn(err.message);
      unresolved.push(place);
      continue;
    }
    if (coords) {
      result[place] = { lat: coords.lat, lng: coords.lng, status: 'auto' };
    } else {
      result[place] = { lat: null, lng: null, status: 'unresolved' };
      unresolved.push(place);
    }
  }
  return { places: result, unresolved };
}

async function main() {
  const retry = process.argv.includes('--retry');
  const dataDir = join(REPO_ROOT, 'static', 'data');
  const people = JSON.parse(readFileSync(join(dataDir, 'people.json'), 'utf8'));
  const placesPath = join(dataDir, 'places.json');
  const places = existsSync(placesPath) ? JSON.parse(readFileSync(placesPath, 'utf8')) : {};
  const config = await import(pathToFileURL(join(REPO_ROOT, 'src', 'lib', 'config.js')).href);
  const countryCodes = config.GEOCODE_COUNTRY_CODES || null;
  const result = await geocodePlaces({ people, places, lookup: (p) => countryFirstLookup(p, countryCodes), retry });
  writeFileSync(placesPath, JSON.stringify(result.places, null, 2) + '\n');
  console.log(`places.json: ${Object.keys(result.places).length} places.`);
  if (result.unresolved.length) {
    console.log('\nCould not resolve these; set lat/lng by hand and status "manual":');
    for (const place of result.unresolved) console.log(`  - ${place}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
