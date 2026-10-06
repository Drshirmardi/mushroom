import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateReleaseManifest } from './release-manifest.mjs';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

const schema = JSON.parse(read('deploy/contracts/release-manifest.schema.json'));
assert(schema.properties.schemaVersion.const === 1, 'manifest schema version must be frozen');
assert(
  JSON.stringify(schema.properties.images.required.sort()) === JSON.stringify(['api', 'app', 'dashboard', 'web']),
  'manifest must require exactly four application images',
);
for (const service of ['api', 'web', 'app', 'dashboard']) {
  assert(
    schema.properties.images.properties[service].pattern.includes(`mushroom-${service}@sha256:`),
    `manifest schema must bind the ${service} key to its repository`,
  );
}

const releaseWorkflow = read('.github/workflows/release.yml');
const promoteWorkflow = read('.github/workflows/promote.yml');
const rollbackWorkflow = read('.github/workflows/rollback.yml');
const deployScript = read('deploy/vps/deploy-release.sh');
const compose = read('deploy/vps/compose.yaml');
const releaseScript = read('scripts/release-images.mjs');

for (const required of [
  "github.event.workflow_run.conclusion == 'success'",
  "github.event.workflow_run.event == 'push'",
  "github.event.workflow_run.head_branch == 'main'",
  'packages: write',
  'packages: read',
  'environment: staging-vps',
  "vars.VPS_CD_ENABLED == 'true'",
]) assert(releaseWorkflow.includes(required), `release workflow is missing: ${required}`);

assert(!releaseWorkflow.includes('pull_request:'), 'release workflow must not publish from pull requests');
assert(!releaseWorkflow.includes('GHCR_READ_TOKEN'), 'deployment must use the ephemeral workflow token, not a stored PAT');
assert(!releaseWorkflow.includes('deploy-production-sim:'), 'automatic workflow must stop after staging');
for (const required of [
  'workflow_dispatch:',
  'RELEASE_APPROVER',
  '.name == "Release and stage"',
  '.name == "deploy-staging" and .conclusion == "success"',
  'run-id: ${{ inputs.release_run_id }}',
  'ref: ${{ steps.manifest.outputs.source-sha }}',
  'environment: production-sim',
]) assert(promoteWorkflow.includes(required), `manual promotion workflow is missing: ${required}`);
assert(rollbackWorkflow.includes('workflow_dispatch:'), 'rollback must be an explicit operator action');
assert(rollbackWorkflow.includes("inputs.environment == 'staging'"), 'rollback must use the selected protected environment');
assert(rollbackWorkflow.includes('ref: main'), 'rollback must run the versioned script from protected main');

for (const forbidden of ['migrate reset', 'migrate down', 'docker compose down', 'POSTGRES_PASSWORD=']) {
  assert(!deployScript.includes(forbidden), `deployment path contains forbidden operation: ${forbidden}`);
}
for (const required of [
  'mktemp -d',
  'rm -rf -- "$docker_config"',
  'run --rm --no-deps api node_modules/prisma/build/index.js migrate deploy',
  'candidate verification failed; restoring previous staging application release',
  'another deployment is active',
]) assert(deployScript.includes(required), `deployment script is missing: ${required}`);

assert(compose.includes('SADAD_TRANSPORT_MODE: disabled'), 'VPS rehearsal must keep Sadad disabled');
assert(compose.includes('postgres_data:'), 'VPS rehearsal requires a project-scoped database volume');
assert(releaseScript.includes(':/root/.cache/trivy'), 'four-image verification must share one temporary Trivy DB cache');
assert(releaseScript.includes("volume', 'rm', '--force'"), 'temporary Trivy cache volume must be removed');

const validManifest = {
  schemaVersion: 1,
  sourceSha: 'a'.repeat(40),
  ciRunId: '10',
  releaseRunId: '11',
  createdAt: '2026-10-06T00:00:00.000Z',
  images: Object.fromEntries(['api', 'web', 'app', 'dashboard'].map((service) => [
    service,
    `ghcr.io/example/mushroom-${service}@sha256:${'b'.repeat(64)}`,
  ])),
};
validateReleaseManifest(validManifest);
let rejectedMutableTag = false;
try {
  validateReleaseManifest({ ...validManifest, images: { ...validManifest.images, api: 'ghcr.io/example/mushroom-api:latest' } });
} catch {
  rejectedMutableTag = true;
}
assert(rejectedMutableTag, 'release manifest validator must reject mutable tags');

run(process.execPath, ['--check', 'scripts/release-images.mjs']);
run(process.execPath, ['--check', 'scripts/deploy-vps.mjs']);
run('bash', ['-n', 'deploy/vps/deploy-release.sh']);

const scratch = mkdtempSync(join(tmpdir(), 'mushroom-release-pipeline-'));
try {
  const environmentRoot = join(scratch, 'staging').replaceAll('\\', '/');
  const secrets = join(scratch, 'staging', 'secrets');
  mkdirSync(secrets, { recursive: true });
  for (const secret of [
    'postgres_password', 'database_url', 'jwt_access_secret', 'refresh_token_pepper',
    'payment_credential_encryption_key', 'payment_credential_decryption_keys',
  ]) writeFileSync(join(secrets, secret), 'synthetic');
  const envPath = join(scratch, 'release.env');
  const digest = `sha256:${'a'.repeat(64)}`;
  writeFileSync(envPath, [
    'MUSHROOM_ENVIRONMENT=staging',
    'COMPOSE_PROJECT_NAME=mushroom-staging',
    `MUSHROOM_ENV_ROOT=${environmentRoot}`,
    'POSTGRES_IMAGE=postgres:16-alpine',
    'POSTGRES_DB=mushroom_staging',
    'POSTGRES_USER=mushroom_staging',
    'PUBLIC_API_URL=https://staging-api.example.test',
    'PUBLIC_WEB_URL=https://staging.example.test',
    'PUBLIC_APP_URL=https://staging-app.example.test',
    'PUBLIC_DASHBOARD_URL=https://staging-dashboard.example.test',
    'APP_ORIGINS=https://staging.example.test,https://staging-app.example.test,https://staging-dashboard.example.test',
    'TRUSTED_PROXIES=127.0.0.1/32',
    'PAYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION=v1',
    'API_PORT=127.0.0.1:3103',
    'WEB_PORT=127.0.0.1:3100',
    'APP_PORT=127.0.0.1:3101',
    'DASHBOARD_PORT=127.0.0.1:3102',
    `API_IMAGE=ghcr.io/sayh3x/mushroom-api@${digest}`,
    `WEB_IMAGE=ghcr.io/sayh3x/mushroom-web@${digest}`,
    `APP_IMAGE=ghcr.io/sayh3x/mushroom-app@${digest}`,
    `DASHBOARD_IMAGE=ghcr.io/sayh3x/mushroom-dashboard@${digest}`,
    '',
  ].join('\n'));
  run('docker', ['compose', '--env-file', envPath, '--file', 'deploy/vps/compose.yaml', 'config', '--quiet']);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log('Release pipeline contract checks passed.');
