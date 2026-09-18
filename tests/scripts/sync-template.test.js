// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyConflict, shouldSync } from '../../scripts/sync-template.mjs';

describe('classifyConflict', () => {
  it('classifies known doc/skill files as theirs', () => {
    expect(classifyConflict('README.md')).toBe('theirs');
    expect(classifyConflict('CLAUDE.md')).toBe('theirs');
    expect(classifyConflict('docs/ARCHITECTURE.md')).toBe('theirs');
    expect(classifyConflict('docs/schema.md')).toBe('theirs');
    expect(classifyConflict('.claude/skills/add-data/SKILL.md')).toBe('theirs');
  });

  it('classifies config.js and static/data paths as ours', () => {
    expect(classifyConflict('src/lib/config.js')).toBe('ours');
    expect(classifyConflict('static/data/people.json')).toBe('ours');
    expect(classifyConflict('static/data/images/S001.jpg')).toBe('ours');
  });

  it('classifies anything else as unknown', () => {
    expect(classifyConflict('src/lib/components/TreeView.svelte')).toBe('unknown');
    expect(classifyConflict('package.json')).toBe('unknown');
  });

  it('does not match near-miss filenames like config.json or config.js.bak', () => {
    expect(classifyConflict('src/lib/config.json')).toBe('unknown');
    expect(classifyConflict('src/lib/config.js.bak')).toBe('unknown');
    expect(classifyConflict('src/lib/config.js.orig')).toBe('unknown');
  });
});

describe('shouldSync', () => {
  it('is false when there is nothing new upstream', () => {
    expect(shouldSync(0)).toBe(false);
  });

  it('is true when upstream has new commits', () => {
    expect(shouldSync(3)).toBe(true);
  });
});
