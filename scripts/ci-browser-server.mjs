import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const dashboard = resolve('apps/dashboard');
const runner = resolve(dashboard, '.next/standalone/apps/dashboard');
assert(existsSync(resolve(runner, 'server.js')), 'Build dashboard standalone before browser smoke');
// Match the image layout; only ignored build output is populated.
cpSync(resolve(dashboard, '.next/static'), resolve(runner, '.next/static'), { recursive: true });
cpSync(resolve(dashboard, 'public'), resolve(runner, 'public'), { recursive: true });
const child = spawn(process.execPath, [resolve('deploy/docker/next-entrypoint.mjs')], {
  cwd: runner,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOSTNAME: '127.0.0.1',
    PORT: '3202',
    PUBLIC_API_URL: 'http://localhost:3003',
    PUBLIC_WEB_URL: process.env.PHASE_11_WEB_URL ?? 'http://127.0.0.1:3200',
    PUBLIC_APP_URL: process.env.PHASE_11_PATIENT_APP_URL ?? 'http://127.0.0.1:3201',
    PUBLIC_DASHBOARD_URL: process.env.PHASE_11_DASHBOARD_URL ?? 'http://localhost:3202',
  },
});
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
