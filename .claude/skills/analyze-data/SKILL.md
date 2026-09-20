---
name: analyze-data
description: Use when the site owner wants to know what's interesting in their family tree dataset, or after add-data finishes and they say yes to the analysis offer — runs scripts/analyze_dataset.py for the numbers, then reads the records themselves to find qualitative patterns, and writes both to static/data/insights.md with evidence and coverage caveats.
---

# Analyzing the Family Tree Dataset

## Overview

Turns the dataset into a short, honest report of what stands out: patterns
in the numbers (lifespans, family sizes, where people lived) **and**
patterns only visible by reading the records (recurring occupations, place
clusters, naming traditions, migrations, unusually documented lines). The
report is written to `static/data/insights.md`, overwritten each run.

**Announce at start:** "Using the analyze-data skill to look for patterns
in the dataset."

## Step 1: Compute the numbers

```
python3 scripts/analyze_dataset.py
```

Add `--root <person id>` to measure ancestry from someone other than
`DEFAULT_PERSON_ID`. Read the JSON output fully — its `coverage` block
tells you how much every other number can be trusted.

## Step 2: Read the records yourself

The script can't see meaning. Read `static/data/people.json`,
`families.json`, `places.json` and `review_queue.json` (and `docs/schema.md`
if a field is unfamiliar) looking for things a script wouldn't flag:

- recurring occupations, and what they suggest (settlers, soldiers, a
  trade passed down a line)
- geographic clusters, and moves between birth and death place (a village
  many people leave, a place many people arrive at, emigration)
- naming traditions (patronymics turning into fixed surnames, first names
  reused down a line)
- unusual family shapes: very large families, remarriages, large age gaps,
  many children who died young, marriages between related surnames
- lines that are unusually deep or unusually thin, and where they stop
- anything in `notes` that tells a story worth calling out

Follow up on anything surprising by looking at the specific people and
families, not just the aggregates.

## Step 3: Write `static/data/insights.md`

Start with `# Family tree insights` and a line `Generated <today's date>
from <N> people and <M> families.` Then these sections, in this order:

1. **Highlights** — the 3–6 most interesting findings, one or two
   sentences each.
2. **By the numbers** — findings backed directly by the script's output,
   with the counts shown.
3. **Patterns from reading the records** — qualitative findings. For each,
   name the people or families it rests on by id (e.g. `P0012`, `F0007`)
   so the owner can check.
4. **Caveats** — where the data is thin (see the rules below).
5. **Open threads** — unresolved `review_queue.json` items that would
   change or extend a finding if resolved.

## Rules

- **Every claim traces to evidence.** Numbers come from the script; every
  qualitative claim names the record ids it rests on. No history, context,
  or explanation that isn't supported by the dataset. If you offer an
  interpretation of *why* something happened, label it "likely" or
  "possibly" and say what it rests on.
- **Occupation and name labels are labels.** Report them as "tagged X" or
  "recorded as X". Never turn a label (an occupation, an ethnonym, a
  surname) into a claim about someone's ethnicity, origin, or identity.
- **Caveat coverage.** Lifespan statistics only include people with both
  birth and death years, so missing death records skew them; an
  apparent gap in births in some era usually means the records stop there,
  not that people didn't exist; a dataset built up from one family's
  documents over-represents the lines those documents cover. Say which of
  these apply, using the `coverage` numbers.
- **Small counts aren't trends.** Don't call something a pattern on fewer
  than about five cases; say "a few" and give the number.
- **Living people.** Anyone with a birth year and no death record could be
  alive. Don't write anything about a person born within the last ~100
  years beyond names, birth years, and places already in the dataset.
- **Don't edit the dataset.** This skill only writes `insights.md`.

## Step 4: Report back

Give the owner the Highlights section in chat and the path to the file.
Leave the change as an uncommitted working-tree edit unless asked to
commit it.
