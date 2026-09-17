import { describe, expect, it } from 'vitest';
import { formatPartialDate, formatBirthYear } from '../../../src/lib/data/formatDate.js';

describe('formatPartialDate', () => {
  it('prefers a full date when present', () => {
    expect(formatPartialDate({ date: '1851-04-02', year: null })).toBe('1851-04-02');
  });

  it('falls back to year when there is no full date', () => {
    expect(formatPartialDate({ date: null, year: '1854' })).toBe('1854');
  });

  it('returns an empty string when neither is known', () => {
    expect(formatPartialDate({ date: null, year: null })).toBe('');
  });

  it('returns an empty string for a null date-info object', () => {
    expect(formatPartialDate(null)).toBe('');
  });
});

describe('formatBirthYear', () => {
  it('extracts the year from a full birth date', () => {
    expect(formatBirthYear({ date: '1979-03-11', year: null })).toBe('1979');
  });

  it('falls back to the year field', () => {
    expect(formatBirthYear({ date: null, year: '1976' })).toBe('1976');
  });

  it('returns "unknown" when there is no birth info at all', () => {
    expect(formatBirthYear(null)).toBe('unknown');
  });
});
