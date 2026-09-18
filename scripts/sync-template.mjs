#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { wireUpstreamRemote } from './setup.mjs';

const THEIRS_PATHS = [
  'README.md',
  'CLAUDE.md',
  'docs/ARCHITECTURE.md',
  'docs/schema.md',
  '.claude/skills/add-data/SKILL.md'
];

const OURS_PATHS = ['src/lib/config.js', 'static/data/'];

export function classifyConflict(path) {
  if (THEIRS_PATHS.includes(path)) return 'theirs';
  if (OURS_PATHS.some((p) => path === p || path.startsWith(p))) return 'ours';
  return 'unknown';
}

export function shouldSync(incomingCount) {
  return incomingCount > 0;
}

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' });
}

function ensureCleanWorktree() {
  const status = run('git status --porcelain');
  if (status.trim() !== '') {
    console.error('Working tree is not clean. Commit or stash your changes before syncing.');
    process.exit(1);
  }
}

function ensureOnMain() {
  const branch = run('git branch --show-current').trim();
  if (branch !== 'main') {
    console.error(`Not on 'main' (currently on '${branch}'). Switch to main before syncing.`);
    process.exit(1);
  }
}

function countIncoming() {
  return parseInt(run('git rev-list HEAD..upstream/main --count').trim(), 10);
}

function hasMergeHead() {
  try {
    run('git rev-parse -q --verify MERGE_HEAD');
    return true;
  } catch {
    return false;
  }
}

function attemptMerge() {
  try {
    run('git merge --no-commit --no-ff upstream/main');
  } catch (err) {
    if (!hasMergeHead()) {
      console.error('git merge failed unexpectedly:\n' + String(err.message || err));
      process.exit(1);
    }
  }
}

function conflictedFiles() {
  return run('git diff --name-only --diff-filter=U')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveConflicts() {
  const unresolved = [];
  for (const path of conflictedFiles()) {
    const side = classifyConflict(path);
    if (side === 'unknown') {
      unresolved.push(path);
      continue;
    }
    run(`git checkout --${side} -- "${path}"`);
    run(`git add "${path}"`);
  }
  return unresolved;
}

function runChecks() {
  run('npm test -- --run');
  run('npm run build');
}

async function main() {
  wireUpstreamRemote();
  ensureCleanWorktree();
  ensureOnMain();
  run('git fetch upstream');

  const incoming = countIncoming();
  if (!shouldSync(incoming)) {
    console.log('Already up to date with upstream/main.');
    return;
  }

  attemptMerge();
  const unresolved = resolveConflicts();

  if (unresolved.length > 0) {
    console.error(
      'Merge has conflicts outside the known auto-resolve rules:\n' +
        unresolved.map((p) => `  ${p}`).join('\n') +
        '\n\nResolve these by hand, `git add` them, then re-run `npm run sync` -- ' +
        'or `git merge --abort` to cancel.'
    );
    process.exit(1);
  }

  try {
    runChecks();
  } catch (err) {
    console.error(
      'Tests or build failed after merging. The merge is staged but not committed --\n' +
        'investigate, or run `git merge --abort` to cancel.\n\n' +
        String(err.message || err)
    );
    process.exit(1);
  }

  run('git commit --no-edit');
  console.log(
    'Synced with upstream/main and committed the merge.\n' +
      'Review with `git log` / `git diff HEAD~1`, then `git push` when ready.'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
