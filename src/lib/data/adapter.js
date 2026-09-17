export function buildFamilyTreeModel({ people, families, sources }) {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const familiesById = new Map(families.map((f) => [f.id, f]));
  const sourcesById = new Map((sources || []).map((s) => [s.id, s]));

  const partnerFamiliesOf = new Map();
  const childFamilyOf = new Map();

  for (const family of families) {
    for (const partnerId of family.partners) {
      if (!partnerId) continue;
      if (!partnerFamiliesOf.has(partnerId)) partnerFamiliesOf.set(partnerId, []);
      partnerFamiliesOf.get(partnerId).push(family.id);
    }
    for (const childId of family.children) {
      childFamilyOf.set(childId, family.id);
    }
  }

  return { peopleById, familiesById, sourcesById, partnerFamiliesOf, childFamilyOf };
}
