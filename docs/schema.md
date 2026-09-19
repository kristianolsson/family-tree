# Family Tree Data Schema

## Design goals
- Human-readable, hand-editable JSON.
- Modeled on GEDCOM's individual / family / source split (NOT a nested
  tree), so remarriages, multiple partners, unknown parents, and
  half-siblings are representable, and a JSON → GEDCOM export later is a
  straightforward field mapping (INDI, FAM, SOUR), not a redesign.
- Every fact carries a `source_id` pointing back to the specific
  photographed document it came from — or `null` when there's no
  photographed document at all (a fact you know personally, added
  straight from text/memory). `sources.json` only ever gets a new entry
  when there's an actual image to link into `static/data/images/`; it's
  not a change log of how facts entered the dataset.
- `notes` is end-user-facing — the visualization site shows it directly
  in the person detail panel — so it holds facts about the person's life
  only: died in infancy, moved abroad, marriage order, an approximate
  date not otherwise capturable in a structured date field. It never
  holds editorial/provenance commentary ("source X says...", "per chart",
  "on first read this was misread as Y"), and it doesn't repeat a fact
  already captured structurally (a second name variant, a linked
  parent/family record, an exact date field) — an empty `""` note is
  correct and preferred over a redundant one. A genuine conflict between
  sources gets resolved if reasonably possible (record the resolved
  fact); if it needs your judgment, it gets a `review_queue.json` entry
  instead (naming the sources there, since that file isn't shown to
  viewers) — not narrated in `notes`.
- **Ids are permanent.** A person/family/source id is assigned once, in
  order, and never renumbered or reused, even if the record is later
  corrected or merged. Downstream code (`src/lib/config.js`'s
  `DEFAULT_PERSON_ID`, anything else that hardcodes an id) depends on
  this.

## Files
- `people.json` — one record per individual (~ GEDCOM INDI)
- `families.json` — one record per partnership/union + children (~ GEDCOM FAM)
- `sources.json` — one record per photographed document (~ GEDCOM SOUR)
- `review_queue.json` — open questions, conflicts, low-confidence items
  needing a human's judgment; not currently read by the app itself
- `places.json` — optional; birth-place coordinates for the ancestor
  heatmap (see below)

## person object
```
{
  "id": "P0001",
  "names": [ {"value": "Jane Doe", "type": "birth", "source_id": "S001"} ],
  "sex": "M | F | null",
  "birth": {"date": "YYYY-MM-DD or null", "year": "YYYY or null", "place": "string or null", "source_id": "S00x or null"},
  "death": {"date": ..., "year": ..., "place": ..., "age_at_death": int|null, "source_id": "S00x or null"},
  "occupation": ["Farmer"],
  "notes": "free text, shown to viewers -- life facts only (died in infancy, moved abroad, marriage order); no source citations or editorial commentary",
  "sources": ["S00x", "S00y"],
  "conflicts": [],
  "status": "confirmed | tentative"
}
```

A person merges across sources primarily by an exact birth-date match,
comparing names as a **token-subset match** rather than requiring an
exact string match — so "Jane", "Jane Doe", and a longer full legal name
all merge together as long as one name's words are a subset of the
other's and the birth date agrees. Where no birth date is known, birth
year is used the same way; where neither is known, entries require an
exact (case-insensitive) name match, since there's no other signal to
anchor on. A birth date shared by two people whose names do **not** look
like variants of each other is deliberately NOT auto-merged (that risks
wrongly combining two different people who happen to share a birthday) —
it's flagged in `review_queue.json` instead as a `DUP-<id>-<id>` item.
Separately, where sources disagree on a specific fact (a date, a
birthplace, a spouse's identity) for a person already confirmed to be the
same, resolve it if reasonably possible and just record the resolved
fact — if it's a genuine open question, it gets a `review_queue.json`
entry instead, not a disagreement narrated in `notes`.

## family object
```
{
  "id": "F0001",
  "partners": ["P0001", "P0002"],
  "children": ["P0003", "P0004"],
  "marriage": {"date": null, "place": null, "type": "gift | sambo | sarbo | unknown"},
  "sources": ["S00x", "S00y"],
  "notes": "free text, shown to viewers -- life facts only; disagreements between sources go into review_queue.json instead"
}
```

A family record merges across sources whenever both partners match
exactly (order doesn't matter) — children from every merged source are
unioned together, and marriage date/place/type are filled in from
whichever source has them. A family with an unknown (`null`) partner is
never auto-merged, since two different unnamed spouses could otherwise be
collapsed into one by mistake.

## source object
One record per photographed image, each with `file` (relative to
`static/data/images/`), `type` (`printed_chart | printed_narrative |
printed_index | handwritten_chart | handwritten_note`), `description`,
`transcription_status` (`transcribed | partial | needs_human_help`), and
`notes`.

## review_queue entry
```
{ "id": "R001", "person_id": "P0001 or null", "type": "conflict | low_confidence | needs_transcription | question",
  "description": "...", "status": "open | resolved", "resolution": null }
```

## places.json
Optional. An object keyed by the exact `birth.place` string of a person,
each value holding coordinates and how they were obtained:
```
{
  "Springfield, Exampleland": {"lat": 59.33, "lng": 18.07, "status": "auto | manual | unresolved"}
}
```
- `auto` — resolved by `npm run geocode` (Nominatim lookup; needs network).
- `manual` — set by hand; `npm run geocode` never overwrites it.
- `unresolved` — the lookup found nothing; `lat`/`lng` are `null`. It is
  not retried unless you run `npm run geocode -- --retry`. A transient
  network error is not cached, so the next plain run retries that place.

`npm run geocode` collects the unique, trimmed birth places, skips any
already cached, and prints the places still unresolved. To fix one by
hand, set its `lat` and `lng` and change `status` to `"manual"`. The
validator reports any birth place missing from this file (only when the
file exists, so older datasets without it still pass).

## Sample dataset

`static/data/` ships with a small, entirely fictional demo family (the
Bergqvist/Lindqvist/Söderström line, 8 people across 4 generations) so
the site works out of the box and doubles as a live example of every
field above. Run `npm run setup` to replace it with a blank dataset when
you're ready to start your own tree.

## GEDCOM conversion

Because person/family/source map ~1:1 onto GEDCOM INDI/FAM/SOUR records,
a script to export this JSON to a `.ged` file is a small follow-on task
whenever you want it — not built in this repo.
