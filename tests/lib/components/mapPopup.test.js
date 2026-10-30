import { describe, expect, it, vi } from 'vitest';
import { buildPopupContent } from '../../../src/lib/components/mapPopup.js';

const group = (places, people) => ({ lat: 1, lng: 2, count: people.length, places, people });
const one = group(
  [{ place: 'X, Land', count: 2 }],
  [
    { id: 'P1', name: 'Anna', year: '1850', place: 'X, Land' },
    { id: 'P2', name: '<b>Olof</b>', year: null, place: 'X, Land' }
  ]
);
const toggleOf = (el) => el.querySelector('.map-popup-toggle');
const peopleOf = (el) => el.querySelector('.map-popup-people');

describe('buildPopupContent', () => {
  it('shows the place and a count that starts collapsed', () => {
    const el = buildPopupContent(one, { noun: 'ancestors' });
    expect(el.textContent).toContain('X, Land — 2 ancestors');
    expect(toggleOf(el).getAttribute('aria-expanded')).toBe('false');
    expect(peopleOf(el).hidden).toBe(true);
  });

  it('expands to a list of people linking to their pages, as text not HTML', () => {
    const onResize = vi.fn();
    const el = buildPopupContent(one, { personHref: (id) => `/base/person/${id}`, onResize });
    toggleOf(el).click();
    expect(peopleOf(el).hidden).toBe(false);
    expect(toggleOf(el).getAttribute('aria-expanded')).toBe('true');
    expect(onResize).toHaveBeenCalledTimes(1);
    const links = [...peopleOf(el).querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/base/person/P1', '/base/person/P2']);
    expect(links[1].textContent).toBe('<b>Olof</b>');
    expect(peopleOf(el).querySelector('b')).toBeNull();
    expect(peopleOf(el).children[0].textContent).toBe('Anna (1850)');
    expect(peopleOf(el).children[1].textContent).toBe('<b>Olof</b>');
  });

  it('calls onSelectPerson on a plain click, but leaves modified clicks to the browser', () => {
    const onSelectPerson = vi.fn();
    const el = buildPopupContent(one, { personHref: (id) => `/person/${id}`, onSelectPerson });
    const link = peopleOf(el).querySelector('a');
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    expect(onSelectPerson).toHaveBeenCalledWith('P1');
    expect(plain.defaultPrevented).toBe(true);
    const cmd = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
    let preventedByPopup;
    // Record whether the popup left the click alone, then stop jsdom navigating.
    el.addEventListener('click', (e) => {
      preventedByPopup = e.defaultPrevented;
      e.preventDefault();
    });
    link.dispatchEvent(cmd);
    expect(onSelectPerson).toHaveBeenCalledTimes(1);
    expect(preventedByPopup).toBe(false);
  });

  it('lists the merged places and adds each person\'s place when a group covers several', () => {
    const multi = group(
      [
        { place: 'P2', count: 1 },
        { place: 'P1', count: 1 }
      ],
      [
        { id: 'A', name: 'Anna', year: '1700', place: 'P1' },
        { id: 'B', name: 'Bo', year: null, place: 'P2' }
      ]
    );
    const el = buildPopupContent(multi, { noun: 'people' });
    expect(toggleOf(el).textContent).toBe('2 people');
    expect([...el.querySelectorAll('.map-popup-places li')].map((li) => li.textContent)).toEqual(['P2 (1)', 'P1 (1)']);
    expect([...peopleOf(el).children].map((li) => li.textContent)).toEqual(['Anna (1700, P1)', 'Bo (P2)']);
  });

  it('uses the singular for one person', () => {
    const single = group([{ place: 'X', count: 1 }], [{ id: 'A', name: 'Anna', year: null, place: 'X' }]);
    expect(toggleOf(buildPopupContent(single, { noun: 'ancestors' })).textContent).toBe('1 ancestor');
    expect(toggleOf(buildPopupContent(single, { noun: 'people' })).textContent).toBe('1 person');
  });
});
