import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const values = {
  apiUrl: process.env.PUBLIC_API_URL || '',
  webUrl: process.env.PUBLIC_WEB_URL || '',
  appUrl: process.env.PUBLIC_APP_URL || '',
  dashboardUrl: process.env.PUBLIC_DASHBOARD_URL || '',
  sadadReturnUrl: process.env.SADAD_RETURN_URL || '',
  analyticsMeasurementId: process.env.PUBLIC_GA4_MEASUREMENT_ID || '',
  analyticsConsent: process.env.PUBLIC_ANALYTICS_CONSENT || 'denied',
  analyticsDebug: process.env.PUBLIC_ANALYTICS_DEBUG || 'false',
};

for (const [name, value] of Object.entries(values)) {
  if (name.startsWith('analytics')) continue;
  if (!value) continue;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${name} must be an http(s) URL without credentials`);
  }
}

await mkdir('public', { recursive: true });
await writeFile(
  'public/runtime-config.js',
  `window.__MUSHROOM_RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(values)});\n`,
  { mode: 0o644 },
);

const child = spawn(process.execPath, ['server.js'], {
  env: process.env,
  stdio: 'inherit',
});

child.once('error', (error) => {
  console.error('Next child process could not start', error);
  process.exitCode = 1;
});
child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
