import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const gotoMock = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$app/state', () => ({ page: { error: { message: 'Person not found' } } }));

import ErrorPage from '../../src/routes/+error.svelte';
import { DEFAULT_PERSON_ID } from '../../src/lib/config.js';

describe('+error.svelte', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gotoMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the error message and an immediate link back to the default person', () => {
    render(ErrorPage);
    expect(screen.getByText('Person not found')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Go now' });
    expect(link).toHaveAttribute('href', `/person/${DEFAULT_PERSON_ID}`);
  });

  it('redirects to the default person after a short delay', () => {
    render(ErrorPage);
    expect(gotoMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(gotoMock).toHaveBeenCalledWith(`/person/${DEFAULT_PERSON_ID}`);
  });
});
