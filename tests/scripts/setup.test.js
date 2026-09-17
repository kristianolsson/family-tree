// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseGitRemotes, resolveUpstreamAction, TEMPLATE_URL } from '../../scripts/setup.mjs';

describe('parseGitRemotes', () => {
  it('parses fetch/push lines into a name -> url map', () => {
    const output = [
      'origin\thttps://github.com/someone/their-family-tree.git (fetch)',
      'origin\thttps://github.com/someone/their-family-tree.git (push)'
    ].join('\n');
    const remotes = parseGitRemotes(output);
    expect(remotes.get('origin')).toBe('https://github.com/someone/their-family-tree.git');
  });

  it('returns an empty map for no remotes', () => {
    expect(parseGitRemotes('').size).toBe(0);
  });
});

describe('resolveUpstreamAction', () => {
  it('skips when origin is already the template itself', () => {
    const remotes = new Map([['origin', TEMPLATE_URL]]);
    expect(resolveUpstreamAction(remotes, TEMPLATE_URL)).toEqual({ action: 'skip-is-template' });
  });

  it('skips when an upstream remote already exists', () => {
    const remotes = new Map([
      ['origin', 'https://github.com/someone/their-family-tree.git'],
      ['upstream', TEMPLATE_URL]
    ]);
    expect(resolveUpstreamAction(remotes, TEMPLATE_URL)).toEqual({ action: 'skip-exists', url: TEMPLATE_URL });
  });

  it('adds upstream when neither condition applies', () => {
    const remotes = new Map([['origin', 'https://github.com/someone/their-family-tree.git']]);
    expect(resolveUpstreamAction(remotes, TEMPLATE_URL)).toEqual({ action: 'add', url: TEMPLATE_URL });
  });
});
