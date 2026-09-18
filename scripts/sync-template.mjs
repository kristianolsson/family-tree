#!/usr/bin/env node
import { execFileSync, execSync } from 'node:child_process';
import { wireUpstreamRemote } from './setup.mjs';

const THEIRS_PATHS = [
  'README.md',
  'CLAUDE.md',
  'docs/ARCHITECTURE.md',
  'docs/schema.md',
  '.claude/skills/add-data/SKILL.md'
];

const OURS_EXACT = ['src/lib/config.js'];
const OURS_PREFIX = ['static/data/'];

export function classifyConflict(path) {
  if (THEIRS_PATHS.includes(path)) return 'theirs';
  if (OURS_EXACT.includes(path)) return 'ours';
  if (OURS_PREFIX.some((p) => path.startsWith(p))) return 'ours';
  return 'unknown';
}

export function shouldSync(incomingCount) {
  return incomingCount > 0;
}

function run(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf8', ...options });
}

// Runs a trusted (no untrusted path arguments) git command, exiting with a
// friendly, contextualized message instead of a raw stack trace on failure.
function runWithContext(cmd, context) {
  try {
    return run(cmd);
  } catch (err) {
    console.error(`${context} failed: ${String(err.message || err)}`);
    process.exit(1);
  }
}

function ensureCleanWorktree() {
  const status = runWithContext('git status --porcelain', 'git status');
  if (status.trim() !== '') {
    console.error('Working tree is not clean. Commit or stash your changes before syncing.');
    process.exit(1);
  }
}

function ensureOnMain() {
  const branch = runWithContext('git branch --show-current', 'git branch --show-current').trim();
  if (branch !== 'main') {
    console.error(`Not on 'main' (currently on '${branch}'). Switch to main before syncing.`);
    process.exit(1);
  }
}

function countIncoming() {
  return parseInt(run('git rev-list HEAD..upstream/main --count').trim(), 10);
}

// `options` (e.g. { cwd }) is forwarded to the underlying git calls -- used
// by tests to point this at a throwaway git fixture instead of the real repo.
export function hasMergeHead(options = {}) {
  try {
    run('git rev-parse -q --verify MERGE_HEAD', options);
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

function conflictedFiles(options = {}) {
  const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=U', '-z'], {
    encoding: 'utf8',
    ...options
  });
  return output.split('\0').filter(Boolean);
}

// `options` (e.g. { cwd }) is forwarded to the underlying git calls -- used
// by tests to point this at a throwaway git fixture instead of the real repo.
export function resolveConflicts(options = {}) {
  const unresolved = [];
  for (const path of conflictedFiles(options)) {
    const side = classifyConflict(path);
    if (side === 'unknown') {
      unresolved.push(path);
      continue;
    }
    try {
      // execFileSync passes `path` as a genuine argv entry, not shell text --
      // no interpolation, so conflicting paths can't reach a shell at all.
      execFileSync('git', ['checkout', `--${side}`, '--', path], { encoding: 'utf8', ...options });
      execFileSync('git', ['add', '--', path], { encoding: 'utf8', ...options });
    } catch {
      // modify/delete conflicts (git has no "their"/"our" content to check
      // out at this path) or any other per-path failure: fall back to the
      // unresolved-path list instead of crashing.
      unresolved.push(path);
    }
  }
  return unresolved;
}

function runChecks() {
  // stdio: 'inherit' so npm test/build output is actually visible to the
  // user -- execSync's err.message does not include the child's stdout/stderr.
  execSync('npm test -- --run', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
}

async function main() {
  wireUpstreamRemote();

  if (hasMergeHead()) {
    // A previous `npm run sync` stopped on an unresolved conflict. The user
    // resolved it by hand and re-ran this script, per our own instructions --
    // don't run ensureCleanWorktree (the staged resolution would fail it) or
    // re-attempt the merge; just pick up where resolveConflicts left off.
    console.log('Resuming an in-progress sync merge.');
  } else {
    ensureCleanWorktree();
    ensureOnMain();
    runWithContext('git fetch upstream', 'git fetch upstream');

    const incoming = countIncoming();
    if (!shouldSync(incoming)) {
      console.log('Already up to date with upstream/main.');
      return;
    }

    attemptMerge();
  }

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
  } catch {
    console.error(
      '\nTests or build failed after merging (see output above). The merge is staged but ' +
        'not committed --\ninvestigate, or run `git merge --abort` to cancel.'
    );
    process.exit(1);
  }

  runWithContext('git commit --no-edit', 'git commit');
  console.log(
    'Synced with upstream/main and committed the merge.\n' +
      'Review with `git log` / `git diff HEAD~1`, then `git push` when ready.'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
