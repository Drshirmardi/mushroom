import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(resolve(tmpdir(), 'api-client-exports-'));
const checker = resolve('scripts/verify-api-client-exports.mjs');
const packageRoot = resolve(directory, 'packages/api-client');
try {
  await mkdir(resolve(packageRoot, 'dist'), { recursive: true });
  await writeFile(resolve(packageRoot, 'package.json'), JSON.stringify({
    type: 'module', exports: { '.': { import: './dist/index.js' }, './chat-ui': { import: './dist/chat-ui.js' } },
  }));
  await writeFile(resolve(packageRoot, 'dist/index.js'), 'export const ready = true;');
  const check = () => spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' });
  assert.notEqual(check().status, 0, 'missing chat-ui output must fail');
  await writeFile(resolve(packageRoot, 'dist/chat-ui.js'), "import 'missing-ui-dependency';");
  assert.notEqual(check().status, 0, 'missing UI dependency must fail');
  await writeFile(resolve(packageRoot, 'dist/chat-ui.js'), 'export const ready = true;');
  assert.equal(check().status, 0, 'all runtime exports must load');
  console.log('PASS API client output and dependency regression checks');
} finally {
  await rm(directory, { recursive: true, force: true });
}
