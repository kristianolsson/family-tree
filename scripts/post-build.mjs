// Copies the SPA shell (404.html) to index.html so hosts that don't serve
// 404.html for unmatched paths (plain Apache/FTP) can still load `/`.
// Run after `vite build`; the rewrite for deep links is static/.htaccess.
import { copyFileSync } from 'node:fs';

copyFileSync('build/404.html', 'build/index.html');
