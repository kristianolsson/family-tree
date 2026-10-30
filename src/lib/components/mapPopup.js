// Builds a map marker's popup as a plain DOM node, which MapView binds to
// the marker. Text nodes only, so names and place names are never parsed as
// HTML. It doesn't touch the map library, so it can be tested on its own.
export function buildPopupContent(group, { noun = 'ancestors', personHref, onSelectPerson, onResize } = {}) {
  const countLabel = (n) => (n === 1 ? `1 ${noun === 'people' ? 'person' : 'ancestor'}` : `${n} ${noun}`);

  const popup = document.createElement('div');
  popup.className = 'map-popup';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'map-popup-toggle';
  toggle.textContent = countLabel(group.count);
  toggle.setAttribute('aria-expanded', 'false');

  const header = document.createElement('div');
  if (group.places.length === 1) {
    header.append(`${group.places[0].place} — `, toggle);
  } else {
    header.append(toggle);
  }
  popup.append(header);

  if (group.places.length > 1) {
    const placeList = document.createElement('ul');
    placeList.className = 'map-popup-places';
    for (const { place, count } of group.places) {
      const item = document.createElement('li');
      item.textContent = `${place} (${count})`;
      placeList.append(item);
    }
    popup.append(placeList);
  }

  const people = document.createElement('ol');
  people.className = 'map-popup-people';
  people.hidden = true;
  for (const entry of group.people || []) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = personHref ? personHref(entry.id) : '#';
    link.textContent = entry.name;
    link.addEventListener('click', (e) => {
      // Let modified clicks (new tab/window) through to the browser.
      if (!onSelectPerson || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onSelectPerson(entry.id);
    });
    item.append(link);
    const details = [entry.year, group.places.length > 1 ? entry.place : null].filter(Boolean).join(', ');
    if (details) item.append(` (${details})`);
    people.append(item);
  }
  popup.append(people);

  toggle.addEventListener('click', () => {
    people.hidden = !people.hidden;
    toggle.setAttribute('aria-expanded', String(!people.hidden));
    onResize?.();
  });

  return popup;
}
