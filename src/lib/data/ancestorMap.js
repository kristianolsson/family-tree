import { primaryName } from './formatDate.js';

export function collectAncestors(model, personId) {
  const seen = new Set();
  const stack = [personId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const family = model.familiesById.get(model.childFamilyOf.get(id));
    for (const parentId of family?.partners || []) stack.push(parentId);
  }
  seen.delete(personId);
  return [...seen];
}

export function buildHeatData(model, ancestorIds, places = {}) {
  const groups = new Map();
  let placed = 0;
  for (const id of ancestorIds) {
    const place = model.peopleById.get(id)?.birth?.place?.trim();
    const coords = place ? places[place] : null;
    if (!coords || coords.lat == null || coords.lng == null) continue;
    placed += 1;
    // Places pinned at identical coordinates (e.g. several villages resolved to
    // their parish) merge into one group so their circles don't pile up.
    const key = `${coords.lat},${coords.lng}`;
    const group = groups.get(key) || { lat: coords.lat, lng: coords.lng, count: 0, places: new Map(), people: [] };
    group.count += 1;
    group.places.set(place, (group.places.get(place) || 0) + 1);
    group.people.push(personEntry(model.peopleById.get(id), place));
    groups.set(key, group);
  }
  return {
    total: ancestorIds.length,
    placed,
    groups: [...groups.values()].map((g) => ({
      lat: g.lat,
      lng: g.lng,
      count: g.count,
      places: [...g.places].map(([place, count]) => ({ place, count })).sort((a, b) => b.count - a.count),
      people: g.people.sort(byBirthYearThenName)
    }))
  };
}

function personEntry(person, place) {
  const birth = person.birth || {};
  const year = birth.date ? birth.date.slice(0, 4) : birth.year ? String(birth.year) : null;
  return { id: person.id, name: primaryName(person), year, place };
}

// Oldest first; people with no birth year go last.
function byBirthYearThenName(a, b) {
  if (a.year !== b.year) {
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return Number(a.year) - Number(b.year);
  }
  return a.name.localeCompare(b.name);
}

export function markerRadius(count) {
  return Math.min(30, 5 + 4 * Math.sqrt(count));
}

// Circles whose centres are closer than this on screen are drawn as one.
export const MERGE_DISTANCE_PX = 24;

// Merges groups that would sit on top of each other at the current zoom.
// `project(lat, lng)` returns screen pixels {x, y}. Greedy and anchored:
// the busiest group claims everything within `distancePx` of its own centre
// (not of each member), so merging never chains into one sprawling blob.
// A merged cluster keeps the anchor's position and combines places and
// people.
export function clusterGroups(groups, project, distancePx = MERGE_DISTANCE_PX) {
  const pending = [...groups]
    .sort((a, b) => b.count - a.count)
    .map((g) => ({ g, p: project(g.lat, g.lng) }));
  const clusters = [];
  while (pending.length) {
    const anchor = pending.shift();
    const members = [anchor.g];
    for (let i = pending.length - 1; i >= 0; i--) {
      const { p } = pending[i];
      if (Math.hypot(p.x - anchor.p.x, p.y - anchor.p.y) < distancePx) {
        members.push(pending.splice(i, 1)[0].g);
      }
    }
    clusters.push(members.length === 1 ? anchor.g : mergeGroups(members));
  }
  return clusters;
}

function mergeGroups(members) {
  const places = new Map();
  for (const g of members) {
    for (const { place, count } of g.places) places.set(place, (places.get(place) || 0) + count);
  }
  return {
    lat: members[0].lat,
    lng: members[0].lng,
    count: members.reduce((n, g) => n + g.count, 0),
    places: [...places].map(([place, count]) => ({ place, count })).sort((a, b) => b.count - a.count),
    people: members.flatMap((g) => g.people || []).sort(byBirthYearThenName)
  };
}
