import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// On GitHub Pages the site lives at /<repository name>/, so the publish workflow sets BASE_PATH.
const basePath = (process.env.BASE_PATH ?? '').trim().replace(/\/+$/, '');

export default defineConfig({
  base: `${basePath}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The Marketplace list is shared with the iPhone app, so there's only one file to edit:
      // mobile/src/data/figures.json. scripts/sync-shared.mjs copies it here before each build.
      '@figures': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  // Source maps are only used to list the open-source licenses; the publish workflow deletes them.
  build: { sourcemap: 'hidden' },
});
