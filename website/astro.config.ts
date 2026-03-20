import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://absolutelyskilled.dev',
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { theme: 'github-dark' } },
});
