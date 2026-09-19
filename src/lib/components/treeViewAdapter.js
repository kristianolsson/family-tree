import { formatPartialDate, primaryName } from '../data/formatDate.js';

export function toFamilyChartNodes(model) {
  const { peopleById, partnerFamiliesOf, childFamilyOf, familiesById } = model;
  const nodes = [];

  for (const [id, person] of peopleById) {
    const rels = {};

    const childFamilyId = childFamilyOf.get(id);
    if (childFamilyId) {
      const parents = familiesById.get(childFamilyId).partners.filter(Boolean);
      if (parents.length) rels.parents = parents;
    }

    const spouseIds = new Set();
    const childIds = new Set();
    for (const familyId of partnerFamiliesOf.get(id) || []) {
      const family = familiesById.get(familyId);
      for (const partnerId of family.partners) {
        if (partnerId && partnerId !== id) spouseIds.add(partnerId);
      }
      for (const childId of family.children) childIds.add(childId);
    }
    if (spouseIds.size) rels.spouses = [...spouseIds];
    if (childIds.size) rels.children = [...childIds];

    const [firstName, ...rest] = primaryName(person).split(' ');
    const data = {
      'first name': firstName,
      'last name': rest.join(' '),
      birthday: formatPartialDate(person.birth)
    };
    if (person.sex === 'M' || person.sex === 'F') data.gender = person.sex;

    nodes.push({ id, data, rels });
  }

  return nodes;
}

// Groups a family-chart link datum with the rest of its family unit: the
// spouse line between a couple plus every line down to (or up from) their
// children share one key, so selecting any of them can highlight the whole
// unit. Ancestry links point child -> [parent, parent]; progeny links point
// [parent, other parent] -> child; spouse links join the two parents.
export function linkGroupKey(link) {
  const parents = link.spouse
    ? [link.source, link.target]
    : Array.isArray(link.source)
      ? link.source
      : link.target;
  const tids = [...new Set([].concat(parents).filter(Boolean).map((p) => p.tid))];
  return tids.sort().join(', ');
}
