// ABOUTME: Vitest test runner configuration with jsdom environment
// ABOUTME: Provides globals and DOM APIs for testing browser extension components
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
