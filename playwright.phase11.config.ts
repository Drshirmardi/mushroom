import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: 'apps/dashboard/e2e',
  testMatch: 'phase-11-access.spec.ts',
  fullyParallel: false,
  timeout: 120_000,
  reporter: 'list',
  outputDir: join(tmpdir(), 'mushroom-phase-11-playwright'),
  use: {
    channel: 'chrome',
    baseURL: process.env.PHASE_11_DASHBOARD_URL ?? 'http://localhost:3202',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
