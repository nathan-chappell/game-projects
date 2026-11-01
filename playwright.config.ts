import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: process.env.LITTLE_LANTERN_TEST_URL ?? 'http://127.0.0.1:8082',
    viewport: { width: 1280, height: 1000 },
    reducedMotion: 'reduce',
  },
});
