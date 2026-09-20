// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  classifyConflict,
  hasMergeHead,
  resolveConflicts,
  shouldSync
} from '../../scripts/sync-template.mjs';

describe('classifyConflict', () => {
  it('classifies known doc/skill files as theirs', () => {
    expect(classifyConflict('README.md')).toBe('theirs');
    expect(classifyConflict('CLAUDE.md')).toBe('theirs');
    expect(classifyConflict('docs/ARCHITECTURE.md')).toBe('theirs');
    expect(classifyConflict('docs/schema.md')).toBe('theirs');
    expect(classifyConflict('.claude/skills/add-data/SKILL.md')).toBe('theirs');
    expect(classifyConflict('.claude/skills/analyze-data/SKILL.md')).toBe('theirs');
  });

  it('classifies the template-owned config constants file as theirs', () => {
    expect(classifyConflict('src/lib/config-template.js')).toBe('theirs');
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

// hasMergeHead and resolveConflicts talk to real git, so these tests build a
// throwaway single-repo fixture and point the functions at it via `{ cwd }`
// instead of process.chdir() (unsupported inside vitest's worker-thread pool).
function git(cwd, args) {
  execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'sync-template-test-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  return dir;
}

// Sets up a modify/delete conflict on static/data/people.json: 'main' (ours)
// deletes the file, a branch called 'incoming' (theirs) modifies it. Leaves
// an in-progress, unresolved merge in the returned repo.
function makeModifyDeleteConflictRepo() {
  const dir = makeRepo();
  mkdirSync(join(dir, 'static', 'data'), { recursive: true });
  writeFileSync(join(dir, 'static', 'data', 'people.json'), 'v1\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'init']);

  git(dir, ['checkout', '-q', '-b', 'incoming']);
  writeFileSync(join(dir, 'static', 'data', 'people.json'), 'v2\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'modify on incoming']);

  git(dir, ['checkout', '-q', 'main']);
  rmSync(join(dir, 'static', 'data', 'people.json'));
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'delete on main']);

  try {
    git(dir, ['merge', '--no-commit', '--no-ff', 'incoming']);
  } catch {
    // expected: the merge stops on the modify/delete conflict
  }
  return dir;
}

describe('hasMergeHead', () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('is false in a repo with no merge in progress', () => {
    dir = makeRepo();
    writeFileSync(join(dir, 'file.txt'), 'hello\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'init']);
    expect(hasMergeHead({ cwd: dir })).toBe(false);
  });

  it('is true while a conflicted merge is in progress', () => {
    dir = makeModifyDeleteConflictRepo();
    expect(hasMergeHead({ cwd: dir })).toBe(true);
  });
});

describe('resolveConflicts modify/delete fallback', () => {
  let dir;

  beforeEach(() => {
    dir = makeModifyDeleteConflictRepo();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports the path as unresolved instead of throwing', () => {
    let unresolved;
    expect(() => {
      unresolved = resolveConflicts({ cwd: dir });
    }).not.toThrow();
    expect(unresolved).toEqual(['static/data/people.json']);
  });
});
