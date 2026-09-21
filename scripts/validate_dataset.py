#!/usr/bin/env python3
"""Integrity checks for the family-tree dataset (people/families/sources/review_queue).

Usage: python3 scripts/validate_dataset.py [--dir PATH]

--dir defaults to static/data, the dataset's home in this repo.
"""
import argparse
import json
import os
import re
import sys


def load(dir_path, name):
    path = os.path.join(dir_path, f"{name}.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def name_tokens(value):
    return set(re.sub(r"[^\w\s]", "", value, flags=re.UNICODE).lower().split())


def names_are_variants(names_a, names_b):
    tokens_a = [name_tokens(n) for n in names_a]
    tokens_b = [name_tokens(n) for n in names_b]
    for a in tokens_a:
        for b in tokens_b:
            if a and b and (a <= b or b <= a):
                return True
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dir",
        default="static/data",
        help="directory containing people.json/families.json/sources.json/review_queue.json (and optionally places.json)",
    )
    args = parser.parse_args()
    data_dir = os.path.expanduser(args.dir)

    people = load(data_dir, "people")
    families = load(data_dir, "families")
    sources = load(data_dir, "sources")
    review_queue = load(data_dir, "review_queue")

    problems = []

    # Unique IDs within each file.
    for label, records in [("people", people), ("families", families), ("sources", sources)]:
        ids = [r["id"] for r in records]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            problems.append(f"Duplicate IDs in {label}.json: {sorted(dupes)}")

    people_by_id = {p["id"]: p for p in people}
    sources_by_id = {s["id"]: s for s in sources}

    # Orphan references: family partners/children -> people.
    for fam in families:
        for pid in fam.get("partners", []) + fam.get("children", []):
            if pid and pid not in people_by_id:
                problems.append(f"{fam['id']}: references unknown person {pid}")

    # Orphan references: person.sources / birth.source_id / death.source_id / names[].source_id -> sources.
    for p in people:
        source_refs = list(p.get("sources", []))
        for field in ("birth", "death"):
            info = p.get(field)
            if info and info.get("source_id"):
                source_refs.append(info["source_id"])
        for n in p.get("names", []):
            if n.get("source_id"):
                source_refs.append(n["source_id"])
        for sid in source_refs:
            if sid not in sources_by_id:
                problems.append(f"{p['id']}: references unknown source {sid}")

    # person.links: each entry needs an http(s) url.
    for p in people:
        for link in p.get("links", []):
            if not str(link.get("url", "")).lower().startswith(("http://", "https://")):
                problems.append(f"{p['id']}: link has a missing or non-http(s) url")

    # Duplicate exact-partner-pair family records (excluding pairs with a null partner).
    seen_pairs = {}
    for fam in families:
        partners = fam.get("partners", [])
        if not all(partners) or len(partners) < 2:
            continue
        key = tuple(sorted(partners))
        seen_pairs.setdefault(key, []).append(fam["id"])
    for key, ids in seen_pairs.items():
        if len(ids) > 1:
            problems.append(f"Duplicate family records for partner pair {key}: {ids}")

    # Every source's file exists on disk (relative to data_dir's sibling images/ or data_dir itself).
    for s in sources:
        file_field = s.get("file")
        if not file_field:
            problems.append(f"{s['id']}: no file field")
            continue
        candidates = [
            os.path.join(data_dir, file_field),
            os.path.join(data_dir, "..", file_field),
            os.path.join(data_dir, "..", "images", os.path.basename(file_field)),
        ]
        if not any(os.path.exists(c) for c in candidates):
            problems.append(f"{s['id']}: file not found ({file_field})")

    # Every birth place has a places.json entry (run `npm run geocode` to fill gaps).
    places_path = os.path.join(data_dir, "places.json")
    if os.path.exists(places_path):
        with open(places_path, encoding="utf-8") as f:
            places = json.load(f)
        for p in people:
            place = ((p.get("birth") or {}).get("place") or "").strip()
            if place and place not in places:
                problems.append(f"{p['id']}: birth place '{place}' missing from places.json (run npm run geocode)")

    # Birth-date collisions between dissimilarly-named people, not already flagged in review_queue.
    flagged_pairs = set()
    for item in review_queue:
        m = re.match(r"DUP-(P\d+)-(P\d+)", item.get("id", ""))
        if m:
            flagged_pairs.add(frozenset(m.groups()))

    by_birth_date = {}
    for p in people:
        date = p.get("birth", {}).get("date")
        if date:
            by_birth_date.setdefault(date, []).append(p)
    for date, group in by_birth_date.items():
        if len(group) < 2:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                names_a = [n["value"] for n in a.get("names", [])]
                names_b = [n["value"] for n in b.get("names", [])]
                if names_are_variants(names_a, names_b):
                    continue
                if frozenset((a["id"], b["id"])) in flagged_pairs:
                    continue
                problems.append(
                    f"Unflagged birth-date collision: {a['id']} ({names_a[0]}) and "
                    f"{b['id']} ({names_b[0]}) both born {date}, names don't look like "
                    f"variants, and there's no DUP-* review_queue entry for this pair"
                )

    print(f"people={len(people)} families={len(families)} sources={len(sources)} "
          f"review_queue={len(review_queue)}")

    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)

    print("No problems found.")


if __name__ == "__main__":
    main()
