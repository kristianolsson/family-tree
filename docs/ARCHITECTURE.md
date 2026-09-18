# Architecture

## Data flow

The four dataset files (`people.json`, `families.json`, `sources.json`,
`review_queue.json`) live in `static/data/` and are fetched by the browser
at runtime (`src/lib/data/loadDataset.js`) — never imported into the JS
bundle. This is deliberate: updating the dataset means overwriting those
files on the host, with no rebuild of the app. `review_queue.json` is
copied for future use but not currently read by the app.

`src/lib/data/adapter.js`'s `buildFamilyTreeModel()` turns the raw
people/families arrays into an adjacency-indexed, renderer-agnostic model:
`peopleById`, `familiesById`, `sourcesById` (all `Map`s), plus
`partnerFamiliesOf` (person id -> array of family ids they're a partner in
— more than one if remarried) and `childFamilyOf` (person id -> the single
family id they're a child in, absent if parents are unknown). This model
has no knowledge of any specific rendering library, and every other part
of the app — routing, search, `PersonPanel`, `TreeView` — talks only to
this model, never to the raw JSON shape.

`src/lib/data/search.js` builds a flat search index from `peopleById` and
matches a typed query against every name variant a person has, labeling
each match with its birth year (`formatBirthYear`) to disambiguate two
different people who happen to share a name.

## Source images

`static/data/images/` holds each source's photo, named by source id
(`S001.jpg`, matching `sources.json`'s own `id`), and `sources.json`'s
`file` field points at `images/S001.jpg` etc. An image-heavy dataset can
meaningfully increase the deployed site's size, but this follows the same
runtime-fetch-not-bundled pattern as the JSON data — nothing under
`static/data/` is ever imported into the JS bundle.

`PersonPanel`'s source citations are clickable when their source has a
`file` (checked per-citation, not assumed) — clicking one opens
`SourceImageModal.svelte`, a full-page overlay showing `/data/${source.file}`
plus the source's description as a caption. Dismissable by the close
button, clicking the backdrop, or Escape. `PersonPanel` owns which source
id (if any) is open as local `$state`; `SourceImageModal` itself has no
knowledge of `PersonPanel` beyond its `source`/`onClose` props, so it's
reusable if another view ever wants to show a source image.

`PersonPanel` takes the whole renderer-agnostic `model` (not just
`sourcesById`) so it can also show marriage info: for each family id in
`model.partnerFamiliesOf.get(person.id)`, it looks up the family's
`marriage` and the other partner's name, and renders a "Married" (or
"Partner", for a `sambo`/`sarbo` union type) row — only when the union
actually has a recorded date, so undated/unformalized unions don't show a
bare "unknown" row. A remarried person can show more than one such row,
one per union with a date.

## Routing

`src/routes/person/[id]/+page.js` loads the dataset, builds the model, and
404s on an unknown id. `src/routes/+page.js` redirects to
`/person/<DEFAULT_PERSON_ID>` (`src/lib/config.js`) — a hardcoded starting
person id, not a name lookup, because the dataset contains duplicate
names. `svelte.config.js` sets `fallback: '404.html'` because person ids
aren't known at build time, unlike a fully prerenderable site — Cloudflare
Pages and GitHub Pages both serve a host's `404.html` for any unmatched
path, letting SvelteKit's client router take over from there (a plain
`index.html` fallback isn't served automatically by either host).
`src/routes/+layout.js` sets `ssr = false` for the same reason — the whole
app is a client-side SPA once the shell HTML loads.

An unknown person id 404s via `error(404, ...)` in `person/[id]/+page.js`
(above), which SvelteKit routes to `src/routes/+error.svelte` — it shows
the error message briefly, then calls `goto()` back to
`/person/<DEFAULT_PERSON_ID>` after a couple of seconds (also offering an
immediate link), so a stale bookmark or a since-changed dataset always
lands somewhere searchable rather than a dead end.

Clicking a tree node or a search result calls SvelteKit's
`goto('/person/<id>')` — client-side navigation, so the URL updates
(back/forward and shareable per-person links work) without unmounting
`TreeView`/`PersonPanel`; they just re-render for the new id.

## Levels-down control

`family-chart` supports capping how many generations of descendants it
renders below the centered person (`chart.setProgenyDepth(n)`) — `0`
means only the centered person, `1` adds their children, `2` adds
grandchildren, and so on; leaving it unset shows every generation, which
can make the tree very wide when centered on an ancestor with many
descendants. `person/[id]/+page.svelte` holds the current depth as local
`$state` (default `DEFAULT_PROGENY_DEPTH = 1`, from `src/lib/config.js`),
passed into `TreeView`'s `progenyDepth` prop (which calls
`setProgenyDepth`, using `undefined` for the `'all'` option) and into
`DepthPicker.svelte`, a small one-click `1 / 2 / 3 / All` control. This is
a session-only UI preference, not part of the URL — it's independent of
which person is centered.

## Responsive detail panel

`person/[id]/+page.svelte` renders `PersonPanel` twice — once inside
`.desktop-panel-wrap` (a right-hand sidebar) and once inside
`.mobile-panel-wrap` (docked to the bottom) — and a `@media (max-width:
720px)` rule shows only one at a time; both share the single `panelOpen`
`$state`, so there's one open/closed state regardless of which layout is
visible. On mobile, collapsed shows just a header bar with the selected
person's name; expanded shows the full panel above it.

The mobile panel is capped at `max-height: 60vh` so it never crowds out
the tree above it, and is meant to take only the height its content
actually needs, up to that cap — not the full 60vh, and never more.
Getting this right needs the flex chain to carry all the way down: each
level from `.mobile-panel-wrap` through `.mobile-panel-content` to
`.person-panel` itself needs `flex: 1; min-height: 0;` (plus
`overflow-y: auto` on `.person-panel`), otherwise a block child's height
defaults to its own content size regardless of an ancestor's constrained
height, and a `PersonPanel` with a lot of sources/notes pushes past the
cap and scrolls the whole page instead of just itself. The same applies
to `.desktop-panel-wrap`.

`TreeView.svelte`'s own `min-height: 600px` (a safety net so the tree
never collapses to zero height) is dropped to `0` below the same 720px
breakpoint — on mobile the tree and the bottom panel stack in a column
inside a `height: 100dvh` layout, and a fixed min-height on the tree
fights that: past a certain content length in the panel, the two
together no longer fit the viewport and the whole page scrolls even
though the panel itself is correctly capped and internally scrollable.
Letting the tree shrink is what keeps the total column height locked to
the viewport.

## Styling

The site uses no CSS framework — plain scoped Svelte styles with a small
set of design tokens in `src/app.css` (`--bg`, `--surface`, `--ink`,
`--ink-dim`, `--rule`, `--accent`, `--accent-dim`, `--font`), plus the
Inter Google Font (linked in `src/app.html`). `family-chart`'s own dark-theme CSS variables
(`--background-color`, `--text-color`, `--female-color`, `--male-color`,
`--genderless-color`) are overridden in `TreeView.svelte`'s own `<style>`
block, along with card border colors and connector-line stroke color —
all family-chart-specific theming stays inside that one component to
preserve the renderer seam (see below). Male/female/genderless card
colors were chosen to meet WCAG AA contrast (4.5:1) against the card
background. The whole `.tree-view` container also disables text
selection and the mobile long-press callout (`user-select: none`,
`-webkit-touch-callout: none`) — cards are tap targets for navigation,
not text, and without this a tap-and-drag while panning on a touchscreen
selects a card's text and triggers the browser's selection popup.

## The renderer seam — swapping the tree library

`src/lib/components/TreeView.svelte` and
`src/lib/components/treeViewAdapter.js` are the only two files that touch
`family-chart`'s node shape or API — `TreeView.svelte` imports the library
itself, while `treeViewAdapter.js` only produces data in the shape
`family-chart` expects, without importing the package. Every other file —
routing, search, the data adapter, `PersonPanel` — talks only to the
renderer-agnostic model from `adapter.js` and to `TreeView`'s own prop
interface:

    <TreeView data={model} centerId={personId} onSelectPerson={(id) => ...} />

Verify the boundary at any time with `grep -rl "family-chart" src/` — it
should list only those two files.

To swap in a different tree-rendering library later:

1. Delete the `family-chart` import and `family-chart/styles/family-chart.css`
   import from `TreeView.svelte`; remove the `f3` CSS class from its
   container element (`<div class="f3 tree-view">`) — `f3` is a
   family-chart-required wrapper class, not a generic one, and would be a
   stray leftover otherwise (keep `tree-view`, see point 4 below); add the
   new library's dependency to `package.json` instead, and remove
   `family-chart` from `package.json`'s dependencies.
2. Rewrite `treeViewAdapter.js`'s `toFamilyChartNodes(model)` (or add a new
   equivalent translation function) to convert the renderer-agnostic model
   into whatever node/edge shape the new library expects. It receives
   exactly `{ peopleById, familiesById, sourcesById, partnerFamiliesOf,
   childFamilyOf }` and must return that library's data format.
3. Rewrite the inside of `TreeView.svelte`'s `$effect` to call the new
   library's mount/update/center-on-id APIs instead of
   `f3.createChart`/`updateMainId`/`updateTree`. Keep firing
   `onSelectPerson(id)` from whatever the new library's node-click handler
   is — that's the only thing the rest of the app depends on.
4. Nothing in `adapter.js`, `search.js`, `PersonPanel.svelte`, or any route
   needs to change — but only if the replacement rendering approach keeps
   using the `tree-view` CSS class name on its container element, because
   `person/[id]/+page.svelte` sizes the tree via
   `:global(.tree-view) { flex: 1 }` in its own scoped styles. A future
   implementer must either keep that class name on their new container, or
   also update that one CSS rule.
