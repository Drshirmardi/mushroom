import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const [image, service] = process.argv.slice(2);
assert(image && ['api', 'web', 'app', 'dashboard'].includes(service), 'Usage: image service');
const prefix = `ci-smoke-${randomBytes(6).toString('hex')}`;
const resources = [];
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 120_000 });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const run = (name, args) => {
  resources.push(name);
  return docker('run', '--name', name, ...args);
};
async function ready(name, path, port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker('exec', name, '/nodejs/bin/node', '-e',
        `fetch('http://127.0.0.1:${port}${path}').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))`);
      return;
    } catch {
      if (docker('inspect', '-f', '{{.State.Running}}', name).trim() !== 'true') break;
      await delay(1000);
    }
  }
  // Application logs are not printed: avoid accidentally disclosing configuration.
  throw new Error(`${service} did not become healthy`);
}
let networkCreated = false;
try {
  const digest = docker('image', 'inspect', '-f', '{{.Id}}', image).trim();
  assert.equal(docker('image', 'inspect', '-f', '{{.Config.User}}', image).trim(), '65532:65532');
  if (service === 'api') {
    docker('network', 'create', prefix);
    networkCreated = true;
    run(`${prefix}-pg`, ['-d', '--network', prefix, '--network-alias', 'postgres',
      '-e', 'POSTGRES_PASSWORD=disposable-ci-only', 'postgres:16-alpine']);
    let databaseReady = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker('exec', `${prefix}-pg`, 'pg_isready', '-U', 'postgres');
        databaseReady = true;
        break;
      } catch { await delay(1000); }
    }
    assert(databaseReady, 'Disposable PostgreSQL readiness');
    const env = ['--network', prefix,
      '-e', 'DATABASE_URL=postgresql://postgres:disposable-ci-only@postgres:5432/postgres',
      '-e', `JWT_ACCESS_SECRET=${randomBytes(48).toString('hex')}`,
      '-e', `REFRESH_TOKEN_PEPPER=${randomBytes(48).toString('hex')}`,
      '-e', 'APP_ORIGINS=https://ci.invalid', '-e', 'TRUSTED_PROXIES=127.0.0.1', '-e', 'PORT=3003'];
    run(`${prefix}-migration`, [...env, image, 'node_modules/prisma/build/index.js', 'migrate', 'deploy']);
    run(`${prefix}-api`, ['-d', ...env, image]);
    await ready(`${prefix}-api`, '/v1/health/live', 3003);
    await ready(`${prefix}-api`, '/v1/health/ready', 3003);
    assert.equal(docker('exec', `${prefix}-api`, '/nodejs/bin/node', '-p', 'process.getuid()').trim(), '65532');
  } else {
    for (const stage of ['staging', 'production']) {
      const name = `${prefix}-${stage}`;
      const apiUrl = `https://${stage}.ci.invalid`;
      run(name, ['-d', '-e', 'PORT=3000', '-e', `PUBLIC_API_URL=${apiUrl}`, image]);
      await ready(name, '/', 3000);
      assert.equal(docker('exec', name, '/nodejs/bin/node', '-p', 'process.getuid()').trim(), '65532');
      const config = docker('exec', name, '/nodejs/bin/node', '-e',
        "fetch('http://127.0.0.1:3000/runtime-config.js').then(r=>r.text()).then(t=>process.stdout.write(t))");
      assert(config.includes(apiUrl), 'Runtime public configuration matches environment');
      assert.equal(docker('inspect', '-f', '{{.Image}}', name).trim(), digest);
    }
  }
  console.log(`${service}: migration/HTTP/non-root/runtime-config applicable smoke PASS`);
} finally {
  let cleanupFailed = false;
  for (const name of resources.reverse()) {
    try { docker('rm', '-f', '-v', name); } catch { cleanupFailed = true; }
  }
  if (networkCreated) {
    try { docker('network', 'rm', prefix); } catch { cleanupFailed = true; }
  }
  assert(!cleanupFailed, 'Run-owned Docker cleanup must succeed');
}
