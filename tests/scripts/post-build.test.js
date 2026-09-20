import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postBuild } from '../../scripts/post-build.mjs';

describe('post-build', () => {
  it('copies the shell to index.html and to person/<id>/index.html', () => {
    const dir = mkdtempSync(join(tmpdir(), 'build-'));
    mkdirSync(join(dir, 'data'));
    writeFileSync(join(dir, '404.html'), '<html>shell</html>');
    writeFileSync(join(dir, 'data', 'people.json'), JSON.stringify([{ id: 'P1' }, { id: 'P2' }]));
    postBuild(dir);
    for (const p of ['index.html', 'person/P1/index.html', 'person/P2/index.html']) {
      expect(readFileSync(join(dir, p), 'utf8')).toBe('<html>shell</html>');
    }
    expect(existsSync(join(dir, 'person', 'P3'))).toBe(false);
  });
});
