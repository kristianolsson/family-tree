# Ancestor Birthplace Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Map" overlay on the person page showing a heatmap of where the selected person's full ancestry was born.

**Architecture:** Coordinates live in a separate `static/data/places.json` keyed by place string, filled by an offline `npm run geocode` script (Nominatim). Pure functions compute the ancestor set and heat groups; a single component (`MapView.svelte`) owns all Leaflet code and is lazy-loaded.

**Tech Stack:** SvelteKit 2 / Svelte 5, vitest + testing-library, Leaflet + leaflet.heat, Node ESM scripts, Python validator.

**Spec:** `docs/superpowers/specs/2026-09-18-ancestor-heatmap-design.md`

## Global Constraints

- Template repo is public: NO real names/places/counts from any real dataset. Sample data must be fictional.
- Existing code style: 2-space indent, single quotes, semicolons; ES modules; comments sparse.
- All `leaflet` / `leaflet.heat` imports only inside `src/lib/components/MapView.svelte`.
- `static/data/places.json` is data (olsson keeps its own); code files are template-owned.
- The app must still work when `places.json` is missing (older installs): treat as `{}`.
- Do not push; commit locally per task. Commit messages: no attribution lines.
- `npm test` and `npm run build` must pass at the end of every task.

---

### Task 1: Ancestor + heat-data pure functions

**Files:**
- Create: `src/lib/data/ancestorMap.js`
- Test: `tests/lib/data/ancestorMap.test.js`

**Interfaces:**
- Produces: `collectAncestors(model, personId) -> string[]` (ids, includes `personId`, no duplicates) and `buildHeatData(model, ancestorIds, places) -> { total: number, placed: number, groups: { place: string, lat: number, lng: number, count: number }[] }`.
- `model` is the object from `buildFamilyTreeModel` (`peopleById`, `familiesById`, `childFamilyOf: Map<childId, familyId>`; `family.partners` are the parents, may contain null).

- [ ] **Step 1: Write failing tests** in `tests/lib/data/ancestorMap.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { collectAncestors, buildHeatData } from '../../../src/lib/data/ancestorMap.js';

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

  it('walks all the way up and includes the person', () => {
    expect(collectAncestors(model(people, families), 'E').sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('returns just the person when there are no parents', () => {
    expect(collectAncestors(model(people, families), 'A')).toEqual(['A']);
  });

  it('ignores null partners', () => {
    const fams = [{ id: 'F1', partners: ['A', null], children: ['C'] }];
    expect(collectAncestors(model(people, fams), 'C').sort()).toEqual(['A', 'C']);
  });

  it('is cycle-safe', () => {
    const fams = [
      { id: 'F1', partners: ['A'], children: ['B'] },
      { id: 'F2', partners: ['B'], children: ['A'] }
    ];
    expect(collectAncestors(model(people, fams), 'A').sort()).toEqual(['A', 'B']);
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
      { place: 'X, Land', lat: 1, lng: 2, count: 2 },
      { place: 'Y, Land', lat: 3, lng: 4, count: 1 }
    ]);
  });

  it('trims place strings before lookup (matches the geocode script keys)', () => {
    const r = buildHeatData(model([person('A', ' X, Land ')], []), ['A'], places);
    expect(r.placed).toBe(1);
  });

  it('handles an empty places map', () => {
    const r = buildHeatData(m, ['A'], {});
    expect(r).toEqual({ total: 1, placed: 0, groups: [] });
  });
});
```

- [ ] **Step 2:** Run `npx vitest run tests/lib/data/ancestorMap.test.js` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `src/lib/data/ancestorMap.js`:

```js
export function collectAncestors(model, personId) {
  const seen = new Set();
  const stack = [personId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const family = model.familiesById.get(model.childFamilyOf.get(id));
    for (const parentId of family?.partners || []) stack.push(parentId);
  }
  return [...seen];
}

export function buildHeatData(model, ancestorIds, places) {
  const groups = new Map();
  let placed = 0;
  for (const id of ancestorIds) {
    const place = model.peopleById.get(id)?.birth?.place?.trim();
    const coords = place ? places[place] : null;
    if (!coords || coords.lat == null || coords.lng == null) continue;
    placed += 1;
    const group = groups.get(place) || { place, lat: coords.lat, lng: coords.lng, count: 0 };
    group.count += 1;
    groups.set(place, group);
  }
  return { total: ancestorIds.length, placed, groups: [...groups.values()] };
}
```

- [ ] **Step 4:** Run the test file — expect PASS. Run `npm test`.
- [ ] **Step 5:** `git add src/lib/data/ancestorMap.js tests/lib/data/ancestorMap.test.js && git commit -m "feat: ancestor collection and heat data functions"`

---

### Task 2: Load `places.json`, sample data, blank-reset

**Files:**
- Modify: `src/lib/data/loadDataset.js`, `src/routes/person/[id]/+page.js`, `scripts/setup.mjs`
- Create: `static/data/places.json`
- Test: `tests/lib/data/loadDataset.test.js`, `tests/routes/person/page.load.test.js`, `tests/scripts/setup.test.js` (only if a blank-reset test exists to extend)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `loadDataset()` result gains `places` (plain object, `{}` when the file is missing/failed/not a plain object). Page `load` returns `{ model, personId, places }`.

- [ ] **Step 1: Update tests first.** In `loadDataset.test.js`: the mock adds `if (url === '/data/places.json') return jsonResponse({ 'A, B': { lat: 1, lng: 2, status: 'auto' } });` and the expected result gains `places: { ... }`; the "fetches once" test now expects 4 calls. Add tests: places 404 (`{ ok: false, status: 404 }`) yields `places: {}`; places fetch rejecting yields `{}`; places returning an array yields `{}`. In `page.load.test.js` `makeFetch`, make the places URL return `{}` (check `url.includes('places')` before the others) and add an assertion that `result.places` equals `{}`.
- [ ] **Step 2:** Run tests — expect FAIL.
- [ ] **Step 3: Implement** in `loadDataset.js`: add

```js
function fetchPlaces(fetchImpl) {
  return fetchImpl(`${base}/data/places.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {}))
    .catch(() => ({}));
}
```

add it to the `Promise.all` and to the resolved object (`{ people, families, sources, places }`). In `+page.js`: `const { places } = dataset;` and `return { model, personId: params.id, places };`.
- [ ] **Step 4:** Create `static/data/places.json`: read the unique non-empty `birth.place` values in the sample `static/data/people.json` and write an entry for each with plausible coordinates in Sweden (these places are fictional, so nearby real Swedish coordinates are fine), `status: "manual"`, 2-decimal precision, keys sorted, trailing newline.
- [ ] **Step 5:** In `scripts/setup.mjs` `resetDataFiles`, after the array-file loop also write `'{}\n'` to `static/data/places.json`; update the log/help text if it lists files. Extend `setup.test.js` only if an existing test covers resetDataFiles' file list.
- [ ] **Step 6:** `npm test` and `npm run build` — expect PASS.
- [ ] **Step 7:** Commit `feat: load optional places.json`.

---

### Task 3: Geocode script

**Files:**
- Create: `scripts/geocode-places.mjs`
- Modify: `package.json` (add `"geocode": "node scripts/geocode-places.mjs"`)
- Test: `tests/scripts/geocode-places.test.js` (start with `// @vitest-environment node`)

**Interfaces:**
- Produces (exports): `collectBirthPlaces(people) -> string[]` (unique, non-empty, trimmed, insertion order); `nominatimLookup(place, fetchImpl = fetch) -> Promise<{lat, lng} | null>`; `geocodePlaces({ people, places, lookup, retry = false, sleep }) -> Promise<{ places, unresolved: string[] }>`.

- [ ] **Step 1: Write failing tests:**

```js
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
```

- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3: Implement** `scripts/geocode-places.mjs`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export async function nominatimLookup(place, fetchImpl = fetch) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status} for "${place}"`);
  const results = await response.json();
  if (!results.length) return null;
  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      console.warn(err.message);
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
  const result = await geocodePlaces({ people, places, lookup: (p) => nominatimLookup(p), retry });
  writeFileSync(placesPath, JSON.stringify(result.places, null, 2) + '\n');
  console.log(`places.json: ${Object.keys(result.places).length} places.`);
  if (result.unresolved.length) {
    console.log('\nCould not resolve these; set lat/lng by hand and status "manual":');
    for (const place of result.unresolved) console.log(`  - ${place}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

(`buildHeatData` already trims place strings (Task 1), matching these keys.)

- [ ] **Step 4:** Add the npm script; run `npm test` and `npm run build` — PASS.
- [ ] **Step 5:** Commit `feat: geocode-places script`.

---

### Task 4: Validator, add-data skill, schema docs

**Files:**
- Modify: `scripts/validate_dataset.py`, `.claude/skills/add-data/SKILL.md`, `docs/schema.md`

- [ ] **Step 1:** In `validate_dataset.py`, after the source-file check, add (only when `places.json` exists in `data_dir`; skip silently otherwise so old installs pass):

```python
    # Every birth place has a places.json entry (run `npm run geocode` to fill gaps).
    places_path = os.path.join(data_dir, "places.json")
    if os.path.exists(places_path):
        with open(places_path, encoding="utf-8") as f:
            places = json.load(f)
        for p in people:
            place = ((p.get("birth") or {}).get("place") or "").strip()
            if place and place not in places:
                problems.append(f"{p['id']}: birth place '{place}' missing from places.json (run npm run geocode)")
```

Also mention `places.json` in the `--dir` help string.
- [ ] **Step 2: Verify:** `python3 scripts/validate_dataset.py --dir static/data` passes on the sample. Then copy `static/data` to the scratchpad/temp dir, delete one key from its `places.json`, rerun with `--dir <copy>` and confirm it fails naming that place. Delete the copy.
- [ ] **Step 3:** In `SKILL.md`: add `static/data/places.json` to the "edits the dataset" file list; in Step 5, insert `npm run geocode` (with a one-line explanation: resolves any new birth places to coordinates via Nominatim, needs network, prints unresolved places to fix by hand or report to the owner) BEFORE the `validate_dataset.py` command and keep validation after it; in Step 7's report, add "any birth places left unresolved by geocoding". Keep the file's existing tone and formatting.
- [ ] **Step 4:** In `docs/schema.md`, document `places.json` (shape, statuses, keyed by exact `birth.place` string, hand-edit rule: set lat/lng and `status: "manual"`), matching the style of the other file sections.
- [ ] **Step 5:** `npm test`, commit `feat: validate places.json; add-data runs geocode`.

---

### Task 5: Map overlay UI

**Files:**
- Create: `src/lib/components/MapView.svelte`, `src/lib/components/MapOverlay.svelte`
- Modify: `src/routes/person/[id]/+page.svelte`, `package.json` (deps)
- Test: `tests/lib/components/MapOverlay.test.js`

**Interfaces:**
- Consumes: `collectAncestors`, `buildHeatData` (Task 1); `data.places` (Task 2).
- `MapView` props: `{ groups: {place, lat, lng, count}[] }`. `MapOverlay` props: `{ model, personId, places, onClose }`.

- [ ] **Step 1:** `npm install leaflet leaflet.heat`.
- [ ] **Step 2: Failing test** `tests/lib/components/MapOverlay.test.js` — mock the Leaflet-owning child so jsdom never loads Leaflet:

```js
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';

vi.mock('../../../src/lib/components/MapView.svelte', async () => ({
  default: (await import('../../fixtures/StubMapView.svelte')).default
}));

import MapOverlay from '../../../src/lib/components/MapOverlay.svelte';

const person = (id, place) => ({
  id,
  names: [{ value: id, type: 'birth', source_id: null }],
  birth: { date: null, year: null, place, source_id: null }
});
const model = buildFamilyTreeModel({
  people: [person('A', 'X'), person('B', 'X'), person('C', null)],
  families: [{ id: 'F1', partners: ['A', 'B'], children: ['C'] }],
  sources: []
});
const places = { X: { lat: 1, lng: 2, status: 'auto' } };

describe('MapOverlay', () => {
  it('shows how many ancestors were placed', () => {
    render(MapOverlay, { props: { model, personId: 'C', places, onClose: vi.fn() } });
    expect(screen.getByText(/2 of 3 ancestors placed/)).toBeInTheDocument();
  });
  it('closes via the button and Escape', async () => {
    const onClose = vi.fn();
    render(MapOverlay, { props: { model, personId: 'C', places, onClose } });
    await fireEvent.click(screen.getByRole('button', { name: /close map/i }));
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
```

Create `tests/fixtures/StubMapView.svelte` containing only `<script>let { groups } = $props();</script><div data-testid="stub-map">{groups.length}</div>`. Run — expect FAIL.
- [ ] **Step 3: `MapView.svelte`** (all Leaflet knowledge lives here): props `{ groups }`; `onMount(async () => { ... })` dynamically imports `leaflet` (default export), sets `window.L = L`, then `await import('leaflet.heat')`, and `import 'leaflet/dist/leaflet.css'` (static, top of the script). Create the map in a `bind:this` div, add `L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 18 })`, add `L.heatLayer(groups.map(g => [g.lat, g.lng, g.count]), { radius: 25, blur: 20 })`, add one `L.circleMarker([lat,lng], { radius: 4 })` per group with `bindPopup(`${g.place} — ${g.count} ancestor${g.count === 1 ? '' : 's'}`)` (escape the place text: build the popup content with a text node, not innerHTML), and `map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 })` when there are groups, else `map.setView([20, 0], 2)`. Return a cleanup calling `map.remove()`. Div has `class="map"`, `width/height: 100%`.
- [ ] **Step 4: `MapOverlay.svelte`**: computes `heat = $derived(buildHeatData(model, collectAncestors(model, personId), places))`; renders a `position: fixed; inset: 0; z-index: 1000` dialog (`role="dialog" aria-modal="true" aria-label="Ancestor birthplace map"`) using the page's CSS tokens (`var(--surface)`, `var(--rule)`, `var(--ink)`, `var(--ink-dim)`), with a header row: title "Where ancestors were born", the note `{heat.placed} of {heat.total} ancestors placed`, and a `<button aria-label="Close map">✕</button>`; below, `<MapView groups={heat.groups} />` filling the rest. `<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />`. If `heat.placed === 0`, show a short message ("No birthplaces with coordinates yet — run `npm run geocode`.") instead of the map. Run the test — expect PASS.
- [ ] **Step 5: Page wiring** in `+page.svelte`: add `let MapOverlay = $state(null); let mapOpen = $state(false); async function openMap() { MapOverlay ??= (await import('$lib/components/MapOverlay.svelte')).default; mapOpen = true; }`; add a `<button type="button" class="map-btn" onclick={openMap}>Map</button>` in `.depth-pickers`' container (a sibling right of the pickers, inside `.toolbar`), styled like the existing controls (border `var(--rule)`, background `var(--surface)`, `var(--ink)`, matching height/radius of the selects in `DepthPicker.svelte` — read it for the exact values); and after `.main`, `{#if mapOpen && MapOverlay}<MapOverlay model={data.model} personId={data.personId} places={data.places} onClose={() => (mapOpen = false)} />{/if}` — this must be inside `.layout` but is `position: fixed` so layout is unaffected.
- [ ] **Step 6:** `npm test`, `npm run build` — PASS. Confirm the build output splits Leaflet into a separate lazy chunk (e.g. `ls build/_app/immutable/chunks` or the build's chunk listing shows a leaflet chunk not referenced by the entry). Note in the report that visual rendering was NOT verified (no browser available).
- [ ] **Step 7:** Commit `feat: ancestor birthplace map overlay`.

---

### Task 6: Docs

**Files:**
- Modify: `README.md`, `docs/ARCHITECTURE.md`

- [ ] **Step 1:** README: mention the Map overlay in the feature list, `static/data/places.json`, and `npm run geocode` (with the run-after-adding-people note and the OpenStreetMap/Nominatim network requirement) in the data/commands sections, following existing formatting. Keep the sample-data-is-fictional framing; no real names/places.
- [ ] **Step 2:** `docs/ARCHITECTURE.md`: add a "Ancestor map" section — files (`ancestorMap.js`, `MapOverlay.svelte`, `MapView.svelte`, `geocode-places.mjs`), the data flow (`places.json` → `loadDataset` → page → overlay), the Leaflet seam rule, lazy loading, and that `places.json` is user-owned data (olsson-side, sync keeps it via the existing `static/data/` rule) while the geocode script is template-owned. Update any "files that diverge" list accordingly if it names data files.
- [ ] **Step 3:** `npm test`, `npm run build`; commit `docs: document ancestor map and geocode`.

---

## After the plan (controller, not a task)
Ask the owner before pushing the template. Then in `olsson-family-tree`: `npm run sync`, `npm run geocode` (network), review unresolved places, run `python3 scripts/validate_dataset.py --dir static/data`, commit the data, and ask before pushing.
