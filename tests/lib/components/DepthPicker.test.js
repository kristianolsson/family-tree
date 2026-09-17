import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DepthPicker from '../../../src/lib/components/DepthPicker.svelte';

describe('DepthPicker', () => {
  it('renders one button per option, with the current value marked active', () => {
    render(DepthPicker, { props: { value: 2, onChange: vi.fn() } });
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked option', async () => {
    const onChange = vi.fn();
    render(DepthPicker, { props: { value: 1, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
