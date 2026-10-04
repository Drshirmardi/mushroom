import { defineConfig } from '@playwright/test';
import existingConfig from './playwright.phase11.config';

// These existing tests exercise browser session/access behavior with explicit mocked
// API responses. Real authorization/database behavior is covered by API integration tests.
export default defineConfig({
  ...existingConfig,
  workers: 1,
  retries: 0,
  use: { ...existingConfig.use, channel: undefined, browserName: 'chromium' },
  webServer: {
    command: 'node scripts/ci-browser-server.mjs',
    url: 'http://localhost:3202',
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
