// Run after `vite build`. Copies the SPA shell (404.html) to index.html and
// to person/<id>/index.html for every person, so plain static hosts (nginx,
// FTP) can load `/` and deep links without any rewrite rules. The app's
// client router takes over once the shell loads.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function postBuild(buildDir = 'build') {
  const shell = join(buildDir, '404.html');
  copyFileSync(shell, join(buildDir, 'index.html'));

  const peopleFile = join(buildDir, 'data', 'people.json');
  if (!existsSync(peopleFile)) return 1;
  const people = JSON.parse(readFileSync(peopleFile, 'utf8'));
  for (const { id } of people) {
    const dir = join(buildDir, 'person', String(id));
    mkdirSync(dir, { recursive: true });
    copyFileSync(shell, join(dir, 'index.html'));
  }
  return people.length + 1;
}

if (import.meta.url === `file://${process.argv[1]}`) postBuild();
