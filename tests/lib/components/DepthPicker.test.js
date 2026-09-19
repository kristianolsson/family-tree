import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DepthPicker from '../../../src/lib/components/DepthPicker.svelte';

const OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'all'];

describe('DepthPicker', () => {
  it('renders a select with every option and the current value selected', () => {
    render(DepthPicker, { props: { label: 'Down', options: OPTIONS, value: 2, onChange: vi.fn() } });
    const select = screen.getByRole('combobox', { name: /Down/ });
    expect(select).toHaveValue('2');
    expect(screen.getAllByRole('option')).toHaveLength(11);
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
  });

  it('calls onChange with the typed option value', async () => {
    const onChange = vi.fn();
    render(DepthPicker, { props: { label: 'Down', options: OPTIONS, value: 1, onChange } });
    const select = screen.getByRole('combobox');
    await fireEvent.change(select, { target: { value: 'all' } });
    expect(onChange).toHaveBeenCalledWith('all');
    await fireEvent.change(select, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('labels the control with the label prop', () => {
    render(DepthPicker, { props: { label: 'Up', options: OPTIONS, value: 1, onChange: vi.fn() } });
    expect(screen.getByText('Up:')).toBeInTheDocument();
  });
});
