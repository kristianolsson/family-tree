import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SearchBox from '../../../src/lib/components/SearchBox.svelte';

const index = [
  { id: 'P1', names: ['Anders Eriksson'], label: 'Anders Eriksson (b. 1851)' },
  { id: 'P3', names: ['Per Eriksson'], label: 'Per Eriksson (b. 1979)' },
  { id: 'P4', names: ['Per Eriksson'], label: 'Per Eriksson (b. 1976)' }
];

describe('SearchBox', () => {
  it('shows matching results as you type', async () => {
    render(SearchBox, { props: { index, onSelect: vi.fn() } });
    const input = screen.getByLabelText('Search by name');
    await fireEvent.input(input, { target: { value: 'per' } });
    expect(screen.getByText('Per Eriksson (b. 1979)')).toBeInTheDocument();
    expect(screen.getByText('Per Eriksson (b. 1976)')).toBeInTheDocument();
    expect(screen.queryByText('Anders Eriksson (b. 1851)')).not.toBeInTheDocument();
  });

  it('calls onSelect with the chosen person id and clears the query', async () => {
    const onSelect = vi.fn();
    render(SearchBox, { props: { index, onSelect } });
    const input = screen.getByLabelText('Search by name');
    await fireEvent.input(input, { target: { value: 'anders' } });
    await fireEvent.click(screen.getByText('Anders Eriksson (b. 1851)'));
    expect(onSelect).toHaveBeenCalledWith('P1');
    expect(input.value).toBe('');
  });
});
