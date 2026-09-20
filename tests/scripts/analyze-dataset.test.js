// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('scripts/analyze_dataset.py', () => {
  const run = (...args) =>
    JSON.parse(
      execFileSync('python3', ['scripts/analyze_dataset.py', ...args], { encoding: 'utf8' })
    );

  it('prints stats for the shipped dataset', () => {
    const out = run('--dir', 'static/data');
    expect(out.counts.people).toBeGreaterThan(0);
    expect(out.coverage.with_birth_year).toBeLessThanOrEqual(out.counts.people);
    expect(out.lifespan.overall.n).toBeGreaterThan(0);
    expect(out.families.children_per_family.n).toBeGreaterThan(0);
  });

  it('measures ancestry from --root', () => {
    const { ancestry } = run('--dir', 'static/data', '--root', 'P0006');
    expect(ancestry.root.id).toBe('P0006');
    expect(ancestry.generations).toBeGreaterThanOrEqual(1);
    expect(ancestry.per_generation['0']).toBe(1);
  });
});
