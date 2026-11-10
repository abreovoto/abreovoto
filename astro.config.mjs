// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { siteOrigin } from './src/lib/preview.ts';

// https://astro.build/config
export default defineConfig({
  // abreovoto.com, or a pull request's preview address when Workers Builds builds its branch.
  site: siteOrigin(process.env.WORKERS_CI_BRANCH),
  trailingSlash: 'always',
  integrations: [
    // The styleguide stays out of search engines; the 404 page is not a page to index.
    sitemap({ filter: (page) => !page.includes('/estilo/') && !page.includes('/404') }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
