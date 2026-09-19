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
    const group = groups.get(key) || { lat: coords.lat, lng: coords.lng, count: 0, places: new Map() };
    group.count += 1;
    group.places.set(place, (group.places.get(place) || 0) + 1);
    groups.set(key, group);
  }
  return {
    total: ancestorIds.length,
    placed,
    groups: [...groups.values()].map((g) => ({
      lat: g.lat,
      lng: g.lng,
      count: g.count,
      places: [...g.places].map(([place, count]) => ({ place, count })).sort((a, b) => b.count - a.count)
    }))
  };
}

export function markerRadius(count) {
  return Math.min(30, 5 + 4 * Math.sqrt(count));
}
