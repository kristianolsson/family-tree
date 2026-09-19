# family-tree

A family-tree visualization site — a SvelteKit SPA that reads a JSON
dataset at runtime and renders an interactive, navigable tree (search, a
per-person detail panel, source citations, marriages, name variants, and
an ancestor birthplace heatmap "Map" overlay).
Static export via `adapter-static`, so it deploys anywhere that serves
static files.

This repo is a **GitHub template** — click "Use this template" (or clone
it) to start your own family tree site with your own data.

**Live demo:** a small fictional sample family, not real data — see this
repo's GitHub Pages deployment (Settings → Pages).

## Develop

    npm install
    npm run dev

## Test

    npm test

## Build

    npm run build

Outputs a static site to `build/`.

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

To use the Map overlay, resolve birth-place coordinates into
`static/data/places.json` (schema in `docs/schema.md`):

    npm run geocode

Run it again after adding people with new birth places. It looks places up
via OpenStreetMap's Nominatim, so it needs network access (about one
request per second). Without `places.json` the app still works; the map
just shows a hint. Map tiles are (c) OpenStreetMap contributors.

After any dataset edit:

    python3 scripts/validate_dataset.py --dir static/data
    npm test && npm run build

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
- Anywhere else that serves static files (Netlify, S3, plain FTP) — build
  locally and upload `build/`.

## Staying in sync with this template

    npm run sync

Fetches and merges `upstream/main`, resolving conflicts automatically
(your data and `config.js`'s `DEFAULT_PERSON_ID` always win; template
docs, skill files, and `config-template.js`'s constants always win), then
runs tests/build before committing. See CLAUDE.md's "Syncing with the
family-tree template" section for exactly what it does and how to resolve
anything it can't.

## Architecture

See `docs/ARCHITECTURE.md` — in particular, how to swap the
tree-rendering library (`family-chart`) for a different one later.
