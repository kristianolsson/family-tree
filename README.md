# family-tree

A family-tree visualization site — a SvelteKit SPA that reads a JSON
dataset at runtime and renders an interactive, navigable family tree.
Static export via `adapter-static`, so it deploys anywhere that serves
static files.

This repo is a **GitHub template** — click "Use this template" (or clone
it) to start your own family tree site with your own data.

**Live demo:** a small fictional sample family, not real data — see this
repo's GitHub Pages deployment (Settings → Pages).

## Features

- **Interactive tree** centered on any person: pan/zoom, click a card to
  re-center. Each person has their own URL (`/person/<id>`), so links and
  back/forward work.
- **Search** across every name variant a person has, with birth years to
  tell same-named people apart.
- **Levels control** — "Up" (ancestors) and "Down" (descendants) dropdowns
  (1–10 or All) cap how many generations are drawn. Defaults are 5 up / 2
  down. Cards at the edge of the visible tree show a "+" badge that
  expands one more level in that direction.
- **Detail panel** with dates, places, occupations, notes, name variants,
  marriages and source citations; citations open the scanned source image.
  It's a sidebar on desktop and docks to the bottom on mobile.
- **Ancestor map** — a "Map" button (globe icon, left of the levels
  control) opens a heatmap of where the selected person's ancestors were
  born, using their whole ancestry regardless of the levels limit. Each
  place gets a circle sized by how many ancestors were born there, with a
  popup naming them. See "Map data" below.
- **Data tooling** — a `validate_dataset.py` integrity checker, a
  `npm run geocode` place-coordinate resolver, and, for Claude Code users,
  an `add-data` skill that transcribes sources into the dataset, and an
  `analyze-data` skill that finds interesting patterns and writes them to
  `static/data/insights.md`.

## Develop

    npm install
    npm run dev

## Test

    npm test

## Build

    npm run build

Outputs a static site to `build/`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Dev server, static build, preview the build |
| `npm test` | Run the test suite |
| `npm run setup` | One-time: add the `upstream` remote, optionally blank the sample data |
| `npm run sync` | Merge template updates into your copy (see below) |
| `npm run geocode` | Resolve birth places to map coordinates (see "Map data") |
| `npm run deploy:demo` | Publish this repo's own demo to GitHub Pages (ignore in your copy) |

## Getting started with your own data

1. Run the setup script:

       npm run setup

   This wires up a git remote (`upstream`) back to this template — see
   "Staying in sync" below — and asks whether to replace the bundled
   sample family with a blank dataset.

2. If you blanked the data, add yourself or your tree's central person:
   hand-edit `static/data/*.json` (documented in full in
   `docs/schema.md`), or, if you're using Claude Code, run the
   `add-data` skill (`.claude/skills/add-data/SKILL.md`) to transcribe a
   source document or pasted text into the dataset, including dedupe
   against what's already there. The first person you add this way also
   gets set as `DEFAULT_PERSON_ID` in `src/lib/config.js` automatically
   — that's who the site shows at `/`. If you hand-edit instead of using
   the skill, that automation doesn't run — set `DEFAULT_PERSON_ID` in
   `src/lib/config.js` to your new person's id yourself, or `/` won't
   have anyone to redirect to.

3. Deploy — see "Deploy" below.

After any dataset edit (run `npm run geocode` first if you added new birth
places):

    python3 scripts/validate_dataset.py --dir static/data
    npm test && npm run build

To see what stands out in your data, run `python3 scripts/analyze_dataset.py`
(prints statistics as JSON) or, in Claude Code, the `analyze-data` skill
(`.claude/skills/analyze-data/SKILL.md`), which adds its own reading of the
records and writes a report to `static/data/insights.md`. `add-data` offers
to run it after each import. Like everything in `static/data/`, the report
is served with the site.

## Map data

The Map overlay needs coordinates for each person's birth place, stored in
`static/data/places.json` (shape in `docs/schema.md`). Fill it with:

    npm run geocode

Run it again whenever you add people with new birth places (the `add-data`
skill does this for you). It looks each new place up via OpenStreetMap's
Nominatim service, so it needs network access and runs at about one request
per second. It never overwrites places you've set by hand, and it prints
any it couldn't resolve — set those by hand in `places.json` (`lat`, `lng`,
`"status": "manual"`), or retry with `npm run geocode -- --retry`. Places
that resolve to the same point are merged into one circle on the map.

Without `places.json` the app works normally; the overlay just shows a hint.
Map tiles and data are (c) OpenStreetMap contributors. The template ships
a small fictional sample `places.json`; if you blank the dataset with
`npm run setup`, it is reset to `{}`.

## Configuration

`src/lib/config.js` holds `DEFAULT_PERSON_ID` (who `/` shows) and is yours.
You can also export `DEFAULT_PROGENY_DEPTH` / `DEFAULT_ANCESTRY_DEPTH`
there to change the default levels down/up. Every other tunable constant
lives in `src/lib/config-template.js`, which is template-owned (see
`docs/ARCHITECTURE.md`, "Two config files").

## Deploy

The `build/` output is plain static files — any static host works:

- **GitHub Pages** — build locally, then either push `build/` to a
  `gh-pages` branch by hand or with the `gh-pages` npm package
  (`npx gh-pages -d build --dotfiles`), and point Settings → Pages →
  "Deploy from a branch" at it. The `--dotfiles` flag is required — it's
  what publishes `build/.nojekyll`, which stops GitHub Pages' default
  Jekyll processing from silently stripping the `_app/` directory
  SvelteKit's build output depends on. (This repo uses its own
  `npm run deploy:demo` for its live demo — feel free to ignore or delete
  it in your own copy.)
- **Cloudflare Pages** — connect your repo, build command `npm run build`,
  output directory `build`.
- **Apache / plain FTP (e.g. Loopia)** — build locally and upload the whole
  of `build/`, including the hidden `.htaccess`. The build writes
  `index.html` (a copy of the SPA shell) and `static/.htaccess` rewrites
  unknown paths to it, so `/person/<id>` links and refreshes work. This
  assumes the site is served from the domain root and the host allows
  `.htaccess` rewrites.
- Anywhere else that serves static files (Netlify, S3) — build locally and
  upload `build/`; the host needs to serve `index.html` for unknown paths.

## Staying in sync with this template

    npm run sync

Fetches and merges `upstream/main`, resolving conflicts automatically
(your data and `config.js` always win; template docs, skill files, and
`config-template.js`'s constants always win), then runs tests/build before
committing. It only rewrites files that conflict, so the first sync after
the map feature adds the template's fictional sample `static/data/places.json`
to your repo — empty it (`{}`) before running `npm run geocode` on your own
data. See CLAUDE.md's "Syncing with the
family-tree template" section for exactly what it does and how to resolve
anything it can't.

## Architecture

See `docs/ARCHITECTURE.md` — in particular, how to swap the
tree-rendering library (`family-chart`) for a different one later.
