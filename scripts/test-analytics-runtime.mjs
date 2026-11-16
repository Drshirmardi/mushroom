import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

// Exercise the actual container runtime generator without running a Next server.
const dir = await mkdtemp(join(tmpdir(), 'mushroom-analytics-runtime-'));
try {
  await writeFile(join(dir, 'server.js'), 'process.exit(0);');
  for (const debug of ['', 'true']) {
    const result = spawnSync(process.execPath, [resolve('deploy/docker/next-entrypoint.mjs')], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, PUBLIC_API_URL: 'https://api.example.test',
        PUBLIC_WEB_URL: 'https://web.example.test', PUBLIC_APP_URL: 'https://app.example.test',
        PUBLIC_DASHBOARD_URL: 'https://dashboard.example.test', SADAD_RETURN_URL: '',
        PUBLIC_GA4_MEASUREMENT_ID: debug ? 'G-TEST123' : '', PUBLIC_ANALYTICS_CONSENT: debug ? 'granted' : '',
        PUBLIC_ANALYTICS_DEBUG: debug, GA4_API_SECRET: 'synthetic-private-never-public' },
    });
    assert.equal(result.status, 0, 'Runtime generator must complete');
    const source = await readFile(join(dir, 'public/runtime-config.js'), 'utf8');
    assert.ok(!source.includes('synthetic-private-never-public'));
    assert.ok(!source.includes('GA4_API_SECRET'));
    const context = { window: {} }; vm.runInNewContext(source, context);
    const runtime = context.window.__MUSHROOM_RUNTIME_CONFIG__;
    assert.equal(runtime.analyticsDebug, debug || 'false');
    assert.equal(runtime.analyticsConsent, debug ? 'granted' : 'denied');
    assert.equal(runtime.analyticsMeasurementId, debug ? 'G-TEST123' : '');
  }
  console.log('Analytics runtime: defaults disabled, explicit debug, private secret excluded PASS.');
} finally {
  // The exact directory was created exclusively by this test under the OS temp root.
  await rm(dir, { recursive: true, force: true });
}
