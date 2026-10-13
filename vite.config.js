import { defineConfig } from 'vite';
import { lovinspoonHtml } from './src/html.js';

export default defineConfig({
  plugins: [lovinspoonHtml()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
  preview: { port: 4193 },
});
