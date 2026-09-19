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
    const group = groups.get(place) || { place, lat: coords.lat, lng: coords.lng, count: 0 };
    group.count += 1;
    groups.set(place, group);
  }
  return { total: ancestorIds.length, placed, groups: [...groups.values()] };
}
