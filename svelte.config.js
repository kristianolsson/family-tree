import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// BASE_PATH (subfolder hosting, e.g. /tree) comes from the environment or a
// `.env` file; real environment variables win over the file.
try {
  process.loadEnvFile('.env');
} catch {
  // no .env file
}

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.env.BASE_PATH ?? ''
    }
  }
};
