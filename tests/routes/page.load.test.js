import { describe, expect, it } from 'vitest';
import { load } from '../../src/routes/+page.js';
import { DEFAULT_PERSON_ID } from '../../src/lib/config.js';

describe('root load', () => {
  it('redirects to the default person', () => {
    expect(() => load()).toThrowError(
      expect.objectContaining({ status: 307, location: `/person/${DEFAULT_PERSON_ID}` })
    );
  });
});
