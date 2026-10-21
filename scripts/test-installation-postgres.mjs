import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const name = `mushroom-installation-${randomUUID()}`;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) {
    // All credentials here are synthetic. Keep Prisma/driver diagnostics out of shared logs anyway.
    throw new Error(`Installer fixture command failed: ${command} (exit ${result.status ?? 'spawn'})`);
  }
  return result.stdout ?? '';
}

try {
  run('docker', ['run', '-d', '--name', name, '-p', '127.0.0.1::5432',
    '-e', 'POSTGRES_PASSWORD=installer-disposable-fixture',
    '-e', 'POSTGRES_DB=mushroom_installation_test', 'postgres:16-alpine']);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const check = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { encoding: 'utf8' });
    if (check.status === 0) { ready = true; break; }
    await new Promise((done) => setTimeout(done, 500));
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready.');
  const port = run('docker', ['port', name, '5432/tcp']).trim().split(':').at(-1);
  const url = `postgresql://postgres:installer-disposable-fixture@127.0.0.1:${port}/mushroom_installation_test?schema=public`;
  const env = { ...process.env, DATABASE_URL: url, INSTALLATION_TEST_DATABASE_URL: url };
  run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: resolve(root, 'apps/api'), env });
  console.log('All repository migrations applied to a new disposable installer database.');
  process.stdout.write(run(process.execPath, ['scripts/test-installation-bootstrap.mjs'], { env }));
} finally {
  const removed = spawnSync('docker', ['rm', '-fv', name], { encoding: 'utf8' });
  if (removed.status !== 0) process.stderr.write(`Fixture cleanup needs review: ${name}\n`);
}
