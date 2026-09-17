# family-tree

A family-tree visualization site — a SvelteKit SPA that reads a JSON
dataset at runtime and renders an interactive, navigable tree (search, a
per-person detail panel, source citations, marriages, name variants).
Static export via `adapter-static`, so it deploys anywhere that serves
static files.

This repo is a **GitHub template** — click "Use this template" (or clone
it) to start your own family tree site with your own data.

**Live demo:** a small fictional sample family, not real data — see this
repo's GitHub Pages deployment (Settings → Pages, or the badge on the
repo's homepage once `.github/workflows/deploy-demo.yml` has run once).

## Develop

    npm install
    npm run dev

## Test

    npm test

## Build

    npm run build

Outputs a static site to `build/`.

## Getting started with your own data

    npm run setup

This wires up a git remote (`upstream`) back to this template — so you
can pull in future improvements, see "Staying in sync" below — and offers
to replace the bundled sample family with a blank dataset. From there,
either hand-edit `static/data/*.json` (documented in full in
`docs/schema.md`) or, if you're using Claude Code, run the `add-source`
skill (`.claude/skills/add-source/SKILL.md`) to transcribe a new source
document into the dataset, including dedupe against what's already there.

After any dataset edit:

    python3 scripts/validate_dataset.py --dir static/data
    npm test && npm run build

## Deploy

The `build/` output is plain static files — any static host works:

- **GitHub Pages** — see `.github/workflows/deploy-demo.yml` for a
  working example (it's what deploys this repo's own live demo).
- **Cloudflare Pages** — connect your repo, build command `npm run build`,
  output directory `build`.
- Anywhere else that serves static files (Netlify, S3, plain FTP) — build
  locally and upload `build/`.

## Staying in sync with this template

See `CLAUDE.md`'s "Syncing with the family-tree template" section for the
exact commands — in short, `git fetch upstream && git merge upstream/main`
whenever you want to pull in template improvements, keeping your own
`static/data/` and `src/lib/config.js` values.

## Architecture

See `docs/ARCHITECTURE.md` — in particular, how to swap the
tree-rendering library (`family-chart`) for a different one later.
