# family-tree

A family-tree visualization SvelteKit SPA — reads a JSON dataset at
runtime, deployed as a static site. This repo is a template: "your data"
below means whatever you've put in `static/data/` in your own copy.

## Start here

- `README.md` — dev/test/build/deploy commands, how to get started with
  your own data.
- `docs/ARCHITECTURE.md` — data flow, the renderer seam (how to swap the
  tree-rendering library), routing, styling, and every feature's design
  rationale. Read this before touching anything under `src/`.
- `docs/schema.md` — the dataset's JSON schema and its merge/dedupe rules.

## Hard constraints

- **The renderer seam.** Only `src/lib/components/TreeView.svelte` and
  `src/lib/components/treeViewAdapter.js` may import or know about
  `family-chart` (the tree library). Before committing any change near the
  tree view, run `grep -rl "family-chart" src/` — it must list only those
  two files.
- **The map seam.** Only `src/lib/components/MapView.svelte` may import
  `leaflet` or `leaflet.heat`. Verify with `grep -rli leaflet src/` — it
  must list only that file.
- **Data is fetched at runtime, never bundled.** Everything under
  `static/data/` (JSON + `images/`) is loaded by the browser via `fetch`,
  not imported into JS, so the dataset can be updated by overwriting files
  on the host with no rebuild. Never import a dataset file from `src/`.
- **Never renumber or reuse an existing person/family/source id.** They're
  assigned once, in order, and never reused — `src/lib/config.js`'s
  `DEFAULT_PERSON_ID` and any other code hardcodes an id, so changing an
  existing one silently breaks whatever refers to it. New records always
  get the next available id (see `docs/schema.md`).

## Workflow

- Run `npm test` and `npm run build` before considering any change done.
- `python3 scripts/validate_dataset.py --dir static/data` checks
  referential integrity (orphan references, duplicate family records,
  missing image files, unflagged birth-date collisions, birth places
  missing from `places.json`) — run it after
  touching any dataset file.
- `npm run geocode` resolves new birth places to map coordinates in
  `static/data/places.json` (needs network; run it after adding people
  with new birth places — the `add-data` skill does). A coordinate you set
  by hand must have `"status": "manual"`, or a later geocode run may
  replace it.
- To add new data — one or more people/families, a source document, or
  both — transcription, dedupe against existing people/families, ID
  assignment, review-queue flagging, and (on first use) setting
  `DEFAULT_PERSON_ID` — use the `add-data` skill
  (`.claude/skills/add-data/SKILL.md`).

## Syncing with the family-tree template

If your copy of this repo started from this template (via "Use this
template" or a clone), pull in future generic improvements (bug fixes,
features, doc updates) with:

    npm run sync

This wraps the plain-git sync mechanism below into one command: it wires
up the `upstream` remote if needed, fetches, merges `upstream/main`,
auto-resolves conflicts per the rule below, runs `npm test -- --run` and
`npm run build`, and — only if both pass — commits the merge. It never
pushes; review with `git log`/`git diff` and `git push` yourself when
ready. If it stops partway (a conflict outside the rule below, or a
failing test/build), it tells you exactly what to do: resolve by hand and
re-run `npm run sync`, or `git merge --abort` to cancel.

**What it's doing, in plain git** (useful if you ever need to do this by
hand, or want to understand what the script did):

    git remote add upstream https://github.com/kristianolsson/family-tree.git
    git fetch upstream
    git merge upstream/main

Conflicts resolve per-path, mechanically:

- Docs and skill files (`README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`,
  `docs/schema.md`, `.claude/skills/add-data/SKILL.md`) and
  `src/lib/config-template.js` (template-owned constants — see
  `docs/ARCHITECTURE.md`'s "Two config files") — take **theirs** (the
  template's version wins outright — that's also how future updates to
  this very section arrive):

      git checkout --theirs <path> && git add <path>

- `src/lib/config.js` — take **ours** (it holds only your
  `DEFAULT_PERSON_ID`, which should point at your own tree, not the
  template's sample data):

      git checkout --ours src/lib/config.js && git add src/lib/config.js

- `static/data/*.json` (including `places.json`), `static/data/images/` —
  take **ours** (your real data over the template's sample data). Note git
  only conflicts on files both sides changed: a derived repo that has no
  `places.json` yet receives the template's fictional sample on first
  sync — empty it (`{}`) before geocoding:

      git checkout --ours static/data/ && git add static/data/

Then verify and finish the merge:

    npm test -- --run && npm run build
    git commit
    git push

**The standing rule:** make every non-data change (bug fix, feature, doc
improvement, skill update) as a commit in the `family-tree` template repo
first, then pull it into your own copy via `npm run sync` — never edit it
directly in your own repo and never back-port it by hand. `static/data/*`
and `src/lib/config.js` are the only files meant to permanently diverge —
`src/lib/config-template.js` is not: it's template-owned, just like this
file.
