import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

const directory = await mkdtemp(join(tmpdir(), 'sadad-runtime-'));
const callback = 'https://drshirmardi.com/v1/payments/providers/sadad/callback';
try {
  await writeFile(join(directory, 'server.js'), '');
  for (const returnUrl of [callback, '']) {
    const child = spawnSync(process.execPath, [resolve('deploy/docker/next-entrypoint.mjs')], {
      cwd: directory,
      env: { ...process.env, PUBLIC_API_URL: 'https://dev-api.example.test', SADAD_RETURN_URL: returnUrl },
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, child.stderr);
    const context = { window: {} };
    runInNewContext(await readFile(join(directory, 'public/runtime-config.js'), 'utf8'), context);
    assert.equal(context.window.__MUSHROOM_RUNTIME_CONFIG__.sadadReturnUrl, returnUrl);
    assert.equal(context.window.__MUSHROOM_RUNTIME_CONFIG__.apiUrl, 'https://dev-api.example.test');
  }
  console.log('Sadad dashboard runtime delivery PASS: explicit merchant callback and disabled empty setting.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
