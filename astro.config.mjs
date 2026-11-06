// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://abreovoto.com',
  trailingSlash: 'always',
  integrations: [
    // The styleguide stays out of search engines; the 404 page is not a page to index.
    sitemap({ filter: (page) => !page.includes('/estilo/') && !page.includes('/404') }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
