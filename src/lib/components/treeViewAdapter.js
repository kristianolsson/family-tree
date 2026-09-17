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
