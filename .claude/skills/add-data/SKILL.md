---
name: add-data
description: Use when the site owner wants to add new genealogy data to the family tree dataset — one or more people, families, and/or a source document (a photo/scan of a chart, list, or note, and/or a text description) — transcribes it, dedupes against existing people/families using the dataset's existing merge rules, assigns new IDs, and flags anything uncertain in review_queue.json. On first use (a blank dataset), also sets DEFAULT_PERSON_ID.
---

# Adding Data to the Family Tree Dataset

## Overview

The site owner periodically has new genealogy data to add — a printed
chart, a handwritten note, a narrative list, a person or two mentioned in
conversation, one document or several in the same run — and wants it
folded into the dataset the `family-tree` site reads. This skill turns
that into: new or updated `people.json`/`families.json` records, a new
`sources.json` entry for each document that has an actual image behind
it, and any `review_queue.json` items the merge raises for the owner's
judgment. On a completely blank dataset, it also sets the site's default
starting person (Step 6).

**Announce at start:** "Using the add-data skill to add this to the
family tree dataset."

## Before you start

- This skill edits the dataset **directly in this repo**:
  `static/data/people.json`, `static/data/families.json`,
  `static/data/sources.json`, `static/data/review_queue.json`,
  `static/data/places.json` (birth-place coordinates, filled by
  `npm run geocode` in Step 5), with images
  in `static/data/images/`. This is the canonical dataset — there's no
  separate source to sync from.
- Read `docs/schema.md` in this repo before editing anything, even if
  you've read it before this session — it's the authority for the exact
  JSON shapes and merge rules below, and gets updated whenever the rules
  change.
- Ask the site owner for whatever they have: an image file, a text
  description, or both. Either is enough to proceed.

## Only log a source when there's an image to link

`sources.json` models photographed documents, not a change log of how
facts entered the dataset. **Only create a new `sources.json` entry (and
only stamp `source_id`/`sources` on the facts it covers) when there's an
actual image to place in `static/data/images/`.** If it's just a fact
told to you in text/chat with no image behind it, don't create a source
record at all: leave `source_id: null` on the affected `names`/`birth`/
`death` entries and `sources: []` on the person/family record — this is
what every person in the bundled sample dataset already looks like.
Don't invent a placeholder source type or a `file: null` entry to cover
this case — it leaks editorial/process narration into `sources.json`,
whose `description` field is viewer-facing (shown in the person panel's
citation line and the source-image modal caption) just like `notes` is.

## Step 1: Assign the source id and place the image (only if there's an image)

Skip this whole step — and Step 2's "every fact needs a `source_id`"
requirement — when there's no image, per the rule above.

1. Read `static/data/sources.json`, find the highest existing `S0NN` id,
   and assign the next one.
2. Copy the image (don't move — the original may live somewhere the
   owner still wants it) into `static/data/images/`, named `<new-id>.jpg`
   (or the original extension, if not a JPEG) — matching the existing
   naming-by-source-id convention.
3. Append a new entry to `static/data/sources.json`:

   ```json
   {
     "id": "S0NN",
     "file": "<new-id>.jpg",
     "type": "printed_chart | printed_narrative | printed_index | handwritten_chart | handwritten_note",
     "description": "...",
     "transcription_status": "transcribed | partial | needs_human_help",
     "notes": ""
   }
   ```

   Pick `type` from what the document actually is. Pick
   `transcription_status` honestly — `needs_human_help` is a legitimate
   outcome, not a failure, when confidence is too low to risk silent
   errors: leave the `people.json`/`families.json` side empty rather than
   guessing.

## Step 2: Transcribe carefully

- Read the image (or the owner's text) character by character for names,
  places, and occupations — don't guess at a spelling that "looks about
  right." An accented character or diacritic silently dropped, or a
  whole word misspelled, is a common and easy-to-miss failure mode —
  proofread against the source rather than typing what looks familiar.
- When a name or place is genuinely ambiguous or hard to read, say so —
  write it into the new source's `notes` field. If it's a specific
  person's name/place that's ambiguous rather than the document overall,
  see the notes-field policy below for how (and whether) to record that
  on the person.
- Preserve real inconsistencies exactly as printed rather than
  normalizing them for uniformity — if the same surname appears spelled
  two different ways across generations on the same document, keep both
  exactly as printed on each individual's own record, and note it rather
  than picking one spelling.
- Every fact you add (a name, a birth, a death, an occupation) needs a
  `source_id` pointing at the id from Step 1 — unless there's no image
  behind this update at all, per the rule above, in which case
  `source_id` stays `null` throughout.

## Notes field policy: viewer-facing facts only

`notes` is shown directly to anyone viewing the tree (the site's person
detail panel renders it verbatim), so treat it as end-user content, not a
scratchpad for how the record was assembled.

**Never write into `notes`:**
- Source citations or attribution: "S008 says...", "per chart", "per the
  owner", "confirmed by the owner"
- Editorial process narration: "on first read this was misread as X,
  corrected to Y", "believed to be... but wasn't fully certain"
- Meta-commentary about what was/wasn't entered: "not entered as a
  separate person", "outside this family tree"
- A fact already captured structurally — a second `names` entry, a
  linked parent/family record, an exact `death.age_at_death` value. Leave
  `notes` as `""` rather than repeating it in prose.

**Do write into `notes`**, as plain declarative sentences with no source
citation:
- Life facts not otherwise capturable in a structured field: died in
  infancy, moved abroad, occupation detail
- Marriage order or an approximate/partial date `marriage.date` or
  `birth.date` has no room for (e.g. "Married around 1995" when the date
  is genuinely just an estimate, not "per chart: 'g. 1995?'")
- A genuine unresolved ambiguity a viewer needs to correctly read the
  tree (e.g., "Unclear whether she was married, or paired with a
  different person") — but without naming which source said what; that
  level of detail belongs in `review_queue.json` instead (see Step 3).

## Step 3: For each person mentioned, decide new vs. existing (dedupe)

Apply the dataset's existing merge rule from `docs/schema.md` — don't
invent a different one:

- A person merges into an **existing** record when there's an exact
  birth-date match (or, absent a date, an exact birth-year match) **and**
  the names are a token-subset match — every word in the shorter name
  appears in the longer one, case-insensitive.
- If the names match this way but a specific fact conflicts (a different
  birthplace, a different spouse) for a person otherwise confirmed to be
  the same, don't silently pick one: resolve it if you reasonably can and
  just record the resolved fact, or — if it needs the owner's judgment —
  add a `review_queue.json` entry naming which source said what (that
  file isn't shown to viewers, so it's the right place for that level of
  detail; see the notes-field policy above for why it doesn't belong in
  `notes`).
- If a birth date/year matches but the names do **not** look like
  variants of each other, do **not** auto-merge — two different people
  sharing a birthday can happen. Create a new person record, and add a
  `review_queue.json` entry:

  ```json
  {
    "id": "DUP-<existing-id>-<new-id>",
    "person_id": "<new-id>",
    "type": "conflict",
    "description": "'<new name>' (<new-id>) shares the exact same birth date as '<existing name>' (<existing-id>), but the names don't look like variants of each other, so they were NOT auto-merged.",
    "status": "open",
    "resolution": null
  }
  ```

- Otherwise (no plausible match at all): create a new person record with
  the next available `P0NNN` id (highest existing id + 1). **Never
  renumber or reuse an existing person's id** — this dataset's ids are
  permanent, order-of-entry identifiers, and the `family-tree` site (and
  anything else consuming this data) looks people up by id, not name.
  Changing an existing id silently breaks whatever refers to it.

## Step 4: For each union/family mentioned, decide new vs. existing

- A family record merges into an **existing** one only when **both**
  partners match exactly (the same two person ids, order doesn't
  matter) — union the new source's children into whatever's already
  recorded, and fill in any `marriage.date`/`place`/`type` field that was
  previously null.
- A family with one unknown/null partner is **never** auto-merged with
  another, even if the known partner matches — two different unnamed
  spouses could otherwise get silently collapsed together. Always create
  a new family record in that case.
- Otherwise, create a new family record with the next available `F0NNN`
  id (same never-renumber rule as Step 3).

## Step 5: Validate before finishing

First resolve any new birth places to map coordinates, then run the
repo's validation script, the test suite, and the build:

```bash
npm run geocode
python3 scripts/validate_dataset.py --dir static/data
npm test
npm run build
```

`npm run geocode` looks up any birth place not yet in `places.json` via
Nominatim (needs network), skips places already cached or hand-set, and
prints any it couldn't resolve — fix those by hand in `places.json` (see
`docs/schema.md`) or report them to the owner. A network error leaves a
place unrecorded so the next run retries it.

The validator checks: no orphan person/source references, no duplicate
exact-partner-pair family records, every source's `file` exists on disk,
and flags any birth-date collision between dissimilarly-named people
that isn't already covered by an open `DUP-*` review_queue entry. It also
checks that every birth place has a `places.json` entry (when that file
exists). Fix
anything it flags — or, for a genuine new dedupe question, add the
`review_queue.json` entry Step 3 describes — before reporting done.
Don't report done with a failing validation run, test, or build.

## Step 6: Set DEFAULT_PERSON_ID on first use

Read `src/lib/config.js`. If `DEFAULT_PERSON_ID` already holds a
non-empty id, skip this step entirely — it only ever applies once, right
after a blank-dataset setup.

If it's empty (`''`), this dataset has no default person yet and the
site's `/` route has nothing to redirect to. Ask the site owner which
person should be the default, starting view — if this run added exactly
one new person, offer that one by name and id as the obvious default.
Once they confirm an id, edit `src/lib/config.js`:

    export const DEFAULT_PERSON_ID = '<chosen id>';

Leave this as part of the same uncommitted working-tree change as the
rest of the run — don't commit it separately.

## Step 7: Report back

Summarize: the new source id, how many new person/family records were
created vs. merged into existing ones, and anything added to
`review_queue.json` that needs a decision, and any birth places left
unresolved by geocoding. Leave the change as an
uncommitted working-tree edit unless asked to commit it.
