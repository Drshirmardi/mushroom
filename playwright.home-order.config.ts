import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: 'apps/app/e2e', testMatch: 'home-order-progress.spec.ts',
  workers: 1, timeout: 30_000, reporter: 'list',
  outputDir: join(tmpdir(), 'mushroom-home-order-playwright'),
  use: { channel: 'chrome', baseURL: 'http://localhost:3001', trace: 'off', video: 'off' },
});
