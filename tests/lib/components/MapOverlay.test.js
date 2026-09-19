import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';

vi.mock('../../../src/lib/components/MapView.svelte', async () => ({
  default: (await import('../../fixtures/StubMapView.svelte')).default
}));

import MapOverlay from '../../../src/lib/components/MapOverlay.svelte';

const person = (id, place) => ({
  id,
  names: [{ value: id, type: 'birth', source_id: null }],
  birth: { date: null, year: null, place, source_id: null }
});
const model = buildFamilyTreeModel({
  people: [person('A', 'X'), person('B', 'X'), person('C', null)],
  families: [{ id: 'F1', partners: ['A', 'B'], children: ['C'] }],
  sources: []
});
const places = { X: { lat: 1, lng: 2, status: 'auto' } };

describe('MapOverlay', () => {
  it('shows how many ancestors were placed', () => {
    render(MapOverlay, { props: { model, personId: 'C', places, onClose: vi.fn() } });
    expect(screen.getByText(/2 of 2 ancestors placed/)).toBeInTheDocument();
  });
  it('closes via the button and Escape', async () => {
    const onClose = vi.fn();
    render(MapOverlay, { props: { model, personId: 'C', places, onClose } });
    await fireEvent.click(screen.getByRole('button', { name: /close map/i }));
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('shows a hint instead of the map when no ancestor has coordinates', () => {
    render(MapOverlay, { props: { model, personId: 'C', places: {}, onClose: vi.fn() } });
    expect(screen.getByText(/npm run geocode/)).toBeInTheDocument();
    expect(screen.queryByTestId('stub-map')).not.toBeInTheDocument();
  });
  it('says so when the person has no known ancestors', () => {
    render(MapOverlay, { props: { model, personId: 'A', places, onClose: vi.fn() } });
    expect(screen.getByText(/no known ancestors/i)).toBeInTheDocument();
  });
});
