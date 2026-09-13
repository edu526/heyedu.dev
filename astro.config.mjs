// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Last real content change (from git), used as the sitemap's <lastmod> —
// more meaningful to crawlers than the build timestamp.
function getContentLastmod() {
  const paths = ['src/pages', 'src/components', 'src/layouts', 'src/i18n'];
  try {
    const iso = execSync(`git log -1 --format=%cI -- ${paths.join(' ')}`, {
      cwd: process.cwd(),
    })
      .toString()
      .trim();
    return iso ? new Date(iso) : new Date();
  } catch {
    return new Date();
  }
}

// https://astro.build/config
export default defineConfig({
  site: 'https://heyedu.dev',
  output: 'static',
  integrations: [
    sitemap({
      lastmod: getContentLastmod(),
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es',
          en: 'en',
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
