// ABOUTME: Vite build configuration for Chrome extension development
// ABOUTME: Uses @crxjs/vite-plugin to bundle manifest v3 extension with HMR support
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
  },
});
