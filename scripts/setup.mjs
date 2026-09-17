#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

export const TEMPLATE_URL = 'https://github.com/kristianolsson/family-tree.git';

export function parseGitRemotes(output) {
  const remotes = new Map();
  for (const line of output.split('\n')) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (match) remotes.set(match[1], match[2]);
  }
  return remotes;
}

export function resolveUpstreamAction(remotes, templateUrl) {
  if (remotes.get('origin') === templateUrl) {
    return { action: 'skip-is-template' };
  }
  if (remotes.has('upstream')) {
    return { action: 'skip-exists', url: remotes.get('upstream') };
  }
  return { action: 'add', url: templateUrl };
}

function wireUpstreamRemote() {
  const output = execSync('git remote -v', { encoding: 'utf8' });
  const remotes = parseGitRemotes(output);
  const result = resolveUpstreamAction(remotes, TEMPLATE_URL);
  if (result.action === 'skip-is-template') {
    console.log(
      'This repo is the family-tree template itself (or a plain clone of it) -- skipping upstream setup.'
    );
  } else if (result.action === 'skip-exists') {
    console.log(`'upstream' remote already set (${result.url}) -- leaving it as-is.`);
  } else {
    execSync(`git remote add upstream ${result.url}`);
    console.log(`Added 'upstream' remote -> ${result.url}`);
  }
}

const BLANK_DATASET_FILES = ['people.json', 'families.json', 'sources.json', 'review_queue.json'];
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function promptResetData() {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) =>
    rl.question(
      'Replace the bundled sample family with a blank dataset to start your own? [y/N] ',
      resolve
    )
  );
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function resetDataFiles() {
  for (const file of BLANK_DATASET_FILES) {
    writeFileSync(join(REPO_ROOT, 'static', 'data', file), '[]\n');
  }
  console.log(
    'Reset static/data/*.json to empty arrays -- review the change with `git status`/`git diff` before committing.'
  );
}

async function main() {
  wireUpstreamRemote();
  const shouldReset = await promptResetData();
  if (shouldReset) {
    resetDataFiles();
  } else {
    console.log('Keeping the bundled sample family in static/data/.');
  }
  console.log(
    '\nNext steps: README.md, the add-source skill (.claude/skills/add-source/SKILL.md), and docs/schema.md.'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
