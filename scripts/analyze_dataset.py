#!/usr/bin/env python3
"""Deterministic statistics over the family-tree dataset, printed as JSON.

Usage: python3 scripts/analyze_dataset.py [--dir PATH] [--root PERSON_ID]

--dir defaults to static/data. --root is the person whose ancestry is
measured; it defaults to DEFAULT_PERSON_ID from src/lib/config.js.

This only computes numbers. The analyze-data skill turns them (plus its own
reading of the records) into static/data/insights.md.
"""
import argparse
import json
import os
import re
import statistics
from collections import Counter


def load(dir_path, name, default=None):
    path = os.path.join(dir_path, f"{name}.json")
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def year_of(fact):
    if not fact:
        return None
    date = fact.get("date") or ""
    if date[:4].isdigit():
        return int(date[:4])
    year = fact.get("year")
    return int(str(year)[:4]) if year and str(year)[:4].isdigit() else None


def display_name(person):
    return person["names"][0]["value"] if person.get("names") else "?"


def last_part(place):
    return (place or "").split(",")[-1].strip()


def top(counter, n):
    return [{"value": k, "count": v} for k, v in counter.most_common(n)]


def default_root():
    try:
        with open("src/lib/config.js", encoding="utf-8") as f:
            match = re.search(r"DEFAULT_PERSON_ID\s*=\s*'([^']+)'", f.read())
        return match.group(1) if match else None
    except OSError:
        return None


def summarize(values):
    if not values:
        return None
    return {
        "n": len(values),
        "median": statistics.median(values),
        "mean": round(statistics.mean(values), 1),
    }


def ancestry(root, people_by_id, child_family):
    """Return {ancestor id: generations above root}, including root at 0."""
    seen = {}
    stack = [(root, 0)]
    while stack:
        pid, depth = stack.pop()
        if pid in seen and seen[pid] <= depth:
            continue
        seen[pid] = depth
        family = child_family.get(pid)
        if family:
            stack += [(p, depth + 1) for p in family["partners"] if p in people_by_id]
    return seen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default="static/data")
    parser.add_argument("--root")
    args = parser.parse_args()
    data_dir = os.path.expanduser(args.dir)

    people = load(data_dir, "people", [])
    families = load(data_dir, "families", [])
    review = load(data_dir, "review_queue", [])
    by_id = {p["id"]: p for p in people}
    child_family = {c: f for f in families for c in f["children"]}
    in_a_family = {x for f in families for x in f["partners"] + f["children"]}

    births = {p["id"]: year_of(p.get("birth")) for p in people}
    deaths = {p["id"]: year_of(p.get("death")) for p in people}
    known_births = [y for y in births.values() if y]

    out = {
        "counts": {
            "people": len(people),
            "families": len(families),
            "families_with_children": sum(1 for f in families if f["children"]),
            "sex": dict(Counter(p.get("sex") or "unknown" for p in people)),
            "tentative": sum(1 for p in people if p.get("status") == "tentative"),
            "isolated": sum(1 for p in people if p["id"] not in in_a_family),
        }
    }

    # Coverage: how much of the data the other numbers rest on.
    by_era = Counter(y // 25 * 25 for y in known_births)
    out["coverage"] = {
        "with_birth_year": len(known_births),
        "with_death_year": sum(1 for y in deaths.values() if y),
        "with_birth_place": sum(1 for p in people if (p.get("birth") or {}).get("place")),
        "with_occupation": sum(1 for p in people if p.get("occupation")),
        "without_known_parents": sum(1 for p in people if p["id"] not in child_family),
        "birth_year_range": [min(known_births), max(known_births)] if known_births else None,
        "births_per_25_years": {str(k): v for k, v in sorted(by_era.items())},
    }

    # Lifespans (only people with both years, so infant deaths without a
    # recorded death year are silently absent -- the skill must caveat this).
    spans = [
        (deaths[i] - births[i], by_id[i])
        for i in by_id
        if births[i] and deaths[i] and deaths[i] >= births[i]
    ]
    ages = [a for a, _ in spans]
    out["lifespan"] = {
        "overall": summarize(ages),
        "under_5": sum(1 for a in ages if a < 5),
        "by_birth_period": {
            f"{lo}-{hi}": summarize([a for a, p in spans if lo <= births[p["id"]] < hi])
            for lo, hi in [(1600, 1750), (1750, 1850), (1850, 1900), (1900, 1950), (1950, 2100)]
            if any(lo <= births[p["id"]] < hi for _, p in spans)
        },
        "longest": [
            {"id": p["id"], "name": display_name(p), "age": a, "born": births[p["id"]]}
            for a, p in sorted(spans, key=lambda x: -x[0])[:5]
        ],
    }

    # Families and marriages.
    sizes = [len(f["children"]) for f in families if f["children"]]
    marriage_ages = {"M": [], "F": []}
    for f in families:
        marriage_year = year_of(f.get("marriage"))
        if not marriage_year:
            continue
        for pid in f["partners"]:
            person = by_id.get(pid)
            if person and births.get(pid) and person.get("sex") in marriage_ages:
                age = marriage_year - births[pid]
                if 14 <= age <= 80:
                    marriage_ages[person["sex"]].append(age)
    partner_counts = Counter(x for f in families for x in f["partners"] if x)
    out["families"] = {
        "children_per_family": summarize(sizes),
        "largest": [
            {
                "family": f["id"],
                "children": len(f["children"]),
                "partners": [display_name(by_id[x]) for x in f["partners"] if x in by_id],
                "married": (f.get("marriage") or {}).get("date") or (f.get("marriage") or {}).get("year"),
            }
            for f in sorted(families, key=lambda f: -len(f["children"]))[:5]
        ],
        "marriage_types": dict(Counter((f.get("marriage") or {}).get("type") or "none" for f in families)),
        "marriage_age_male": summarize(marriage_ages["M"]),
        "marriage_age_female": summarize(marriage_ages["F"]),
        "people_in_multiple_families": sum(1 for v in partner_counts.values() if v > 1),
    }

    # Names and occupations.
    out["names"] = {
        "surnames": top(Counter(display_name(p).split()[-1] for p in people), 12),
        "first_names": top(Counter(display_name(p).split()[0] for p in people), 12),
        "patronymic_style_surnames": sum(
            1 for p in people if re.search(r"(son|dotter|sdotter)$", display_name(p).split()[-1])
        ),
    }
    occupations = Counter(o.split("(")[0].strip().lower() for p in people for o in p.get("occupation", []))
    out["occupations"] = top(occupations, 15)

    # Places and movement.
    birth_places = Counter((p.get("birth") or {}).get("place") for p in people if (p.get("birth") or {}).get("place"))
    moved = [
        {"id": p["id"], "name": display_name(p), "from": p["birth"]["place"], "to": p["death"]["place"]}
        for p in people
        if (p.get("birth") or {}).get("place")
        and (p.get("death") or {}).get("place")
        and last_part(p["birth"]["place"]) != last_part(p["death"]["place"])
    ]
    out["places"] = {
        "birth_places": top(birth_places, 10),
        "birth_regions": top(Counter(last_part(p) for p in birth_places.elements()), 10),
        "moved_between_birth_and_death_region": len(moved),
        "moved_examples": moved[:10],
    }

    # Ancestry of the root person.
    root = args.root or default_root()
    if root in by_id:
        seen = ancestry(root, by_id, child_family)
        regions = Counter(
            last_part(by_id[i]["birth"].get("place"))
            for i in seen
            if i != root and (by_id[i].get("birth") or {}).get("place")
        )
        earliest = sorted(
            (i for i in seen if births.get(i)), key=lambda i: births[i]
        )[:3]
        out["ancestry"] = {
            "root": {"id": root, "name": display_name(by_id[root])},
            "ancestors": len(seen) - 1,
            "generations": max(seen.values()),
            "per_generation": {str(k): v for k, v in sorted(Counter(seen.values()).items())},
            "birth_regions": top(regions, 8),
            "earliest": [
                {"id": i, "name": display_name(by_id[i]), "born": births[i],
                 "place": (by_id[i].get("birth") or {}).get("place")}
                for i in earliest
            ],
        }

    out["open_review_items"] = dict(Counter(r.get("type") for r in review))
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
