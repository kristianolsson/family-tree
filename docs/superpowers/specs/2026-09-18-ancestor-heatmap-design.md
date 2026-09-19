# Ancestor birthplace heatmap — design

## Goal
Show, as a map overlay, where the selected person's full ancestry was born, with heat
showing where ancestors cluster. Uses all ancestors regardless of the tree's depth limit.

## Data
- New `static/data/places.json`: object keyed by the exact `birth.place` string.
  `{ "Place, Country": { "lat": 0.0, "lng": 0.0, "status": "auto" | "manual" | "unresolved" } }`
  (`lat`/`lng` are `null` when `unresolved`).
- Data file, so it is owned by the consuming repo (like `people.json`). The template ships a small
  generic sample.
- Coordinates live per place, not per person: each unique place is geocoded once, and correcting
  one entry fixes everyone born there. `people.json` is unchanged.

## Geocoding script
- `npm run geocode` (`scripts/geocode-places.mjs`, template-owned code).
- Collects unique non-empty `birth.place` values from `people.json`, skips any already present in
  `places.json`, and resolves the rest via Nominatim at <= 1 request/sec with a descriptive
  User-Agent. Writes `auto` on success and `unresolved` on no result.
- Never overwrites `manual` entries. `unresolved` entries are retried only with `--retry`.
- Prints the unresolved places so the owner can fix them by hand (set lat/lng, `status: "manual"`).
- The app never geocodes at runtime.
- The `add-data` skill gets a step to run `npm run geocode` after adding people, and
  `scripts/validate_dataset.py` flags any `birth.place` missing from `places.json`.

## UI
- A "Map" button in the person page toolbar opens a full-viewport overlay (close button, Esc).
  The tree underneath keeps its state.
- `collectAncestors(personId, people)` is a pure function that walks `rels.parents` to the top,
  ignores the depth limit, includes the selected person, and is cycle-safe.
- `placesToPoints(ancestors, places)` maps birth places to `[lat, lng]`, one point per ancestor,
  and skips missing or unresolved places. The overlay shows "N of M ancestors placed".
- `MapView.svelte` uses Leaflet with OpenStreetMap tiles (attribution shown) and `leaflet.heat`,
  fitting the map to the points. It also draws one circle marker per place with a popup
  ("Place, 7 ancestors").
- Leaflet is dynamically imported when the overlay opens, so the main bundle does not grow.
- All Leaflet code stays inside `MapView.svelte`, as `family-chart` does in `TreeView.svelte`.

## Testing
Unit tests for `collectAncestors` (cycles, missing parents, depth independence) and
`placesToPoints` (skips unresolved/missing), plus geocode script logic with a stubbed fetch
(skip cached, keep manual, mark unresolved). Leaflet rendering is verified manually via
`npm run dev`, since jsdom cannot run it.

## Docs and sync
Update README and `docs/ARCHITECTURE.md` (new files, deps, geocode command) and `docs/schema.md`
(`places.json` shape) in the same change. Ship in the template first, then `npm run sync`
into olsson, then run `npm run geocode` there to build its real `places.json`.

## Out of scope
Death places, per-generation coloring, time animation, runtime geocoding.
