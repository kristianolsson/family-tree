import { formatBirthYear, primaryName } from './formatDate.js';

export function buildSearchIndex(peopleById) {
  const index = [];
  for (const [id, person] of peopleById) {
    const names = person.names.map((n) => n.value);
    const primary = primaryName(person);
    index.push({ id, names, label: `${primary} (b. ${formatBirthYear(person.birth)})` });
  }
  return index;
}

export function searchPeople(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((entry) => entry.names.some((name) => name.toLowerCase().includes(q))).slice(0, 20);
}
