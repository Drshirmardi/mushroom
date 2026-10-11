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
  return result.stdout ?? '';
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
const consentPolicy = JSON.parse(read('deploy/vps/reference-data/rehearsal-consent-policy.json'));
const devWorkflow = read('.github/workflows/dev-sync.yml');
const devDeployScript = read('deploy/vps/deploy-dev.sh');
const devCompose = read('deploy/vps/compose.dev.yaml');
const devSyncScript = read('scripts/deploy-dev-vps.mjs');
const devServiceScript = read('deploy/vps/dev-service.sh');
const nextDevOriginConfig = read('config/next-dev-origins.ts');
const nextConfigs = ['web', 'app', 'dashboard'].map((application) =>
  read(`apps/${application}/next.config.ts`));

for (const required of [
  "github.event.workflow_run.conclusion == 'success'",
  "github.event.workflow_run.event == 'push'",
  "github.event.workflow_run.head_branch == 'main'",
  'packages: write',
  'packages: read',
  'name: Validate repository-scoped VPS inputs',
  "vars.VPS_CD_ENABLED == 'true'",
  "vars.GHCR_ATTESTATIONS_ENABLED == 'true'",
]) assert(releaseWorkflow.includes(required), `release workflow is missing: ${required}`);

assert(
  releaseWorkflow.indexOf('name: Preserve immutable release manifest')
    < releaseWorkflow.indexOf('name: Attest API image provenance'),
  'release manifest must be preserved before optional provenance attestations',
);
assert(
  releaseWorkflow.match(/if: vars\.GHCR_ATTESTATIONS_ENABLED == 'true'/gu)?.length === 5,
  'subject extraction and all four provenance steps must be explicitly plan-gated',
);

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
  'name: Validate repository-scoped VPS inputs',
]) assert(promoteWorkflow.includes(required), `manual promotion workflow is missing: ${required}`);
for (const workflow of [releaseWorkflow, promoteWorkflow, rollbackWorkflow]) {
  assert(!workflow.includes('environment: staging-vps'), 'Free-plan VPS workflow must not require staging Environment');
  assert(!workflow.includes('environment: production-sim'), 'Free-plan VPS workflow must not require production Environment');
}
assert(rollbackWorkflow.includes('workflow_dispatch:'), 'rollback must be an explicit operator action');
assert(rollbackWorkflow.includes("inputs.environment == 'production-sim'"), 'production-sim rollback must retain its owner gate');
assert(rollbackWorkflow.includes('ref: main'), 'rollback must run the versioned script from protected main');

for (const forbidden of ['migrate reset', 'migrate down', 'docker compose down', 'POSTGRES_PASSWORD=']) {
  assert(!deployScript.includes(forbidden), `deployment path contains forbidden operation: ${forbidden}`);
}
for (const required of [
  'mktemp -d',
  'rm -rf -- "$docker_config"',
  'run --rm --no-deps api node_modules/prisma/build/index.js migrate deploy',
  'api prisma/manage-consent-policy.mjs publish',
  'api prisma/manage-consent-policy.mjs verify',
  'candidate verification failed; restoring previous staging application release',
  'another deployment is active',
]) assert(deployScript.includes(required), `deployment script is missing: ${required}`);

assert(
  JSON.stringify(consentPolicy.allowedEnvironments) === JSON.stringify(['staging', 'production-sim']),
  'rehearsal consent policy must be restricted to both rehearsal environments',
);
assert(consentPolicy.title.includes('محیط آزمایشی'), 'rehearsal consent policy must be visibly non-production');

assert(
  compose.includes('SADAD_TRANSPORT_MODE: "${SADAD_TRANSPORT_MODE:-disabled}"'),
  'VPS runtime must keep Sadad disabled by default while allowing explicit activation',
);
assert(compose.includes('postgres_data:'), 'VPS rehearsal requires a project-scoped database volume');
assert(releaseScript.includes(':/root/.cache/trivy'), 'four-image verification must share one temporary Trivy DB cache');
assert(releaseScript.includes("volume', 'rm', '--force'"), 'temporary Trivy cache volume must be removed');

for (const required of [
  'branches: [dev]',
  "vars.VPS_DEV_CD_ENABLED == 'true'",
  'cancel-in-progress: false',
  'VPS_KNOWN_HOSTS',
  'node scripts/deploy-dev-vps.mjs "$GITHUB_SHA"',
]) assert(devWorkflow.includes(required), `dev sync workflow is missing: ${required}`);
for (const forbidden of ['packages: write', 'GHCR_TOKEN', 'GITHUB_TOKEN', 'docker/login-action']) {
  assert(!devWorkflow.includes(forbidden), `dev sync must not receive release credentials: ${forbidden}`);
}
for (const required of [
  'StrictHostKeyChecking=yes',
  '--checksum',
  '--delete-delay',
  '--delay-updates',
  '--exclude=/.git/',
  '--exclude=/apps/api/src/generated/',
  '--exclude=/apps/web/public/runtime-config.js',
  'flock -w 600 "$HOME/mushroom/dev/state/deploy.lock" true',
  'mushroom/dev/workspace',
]) assert(devSyncScript.includes(required), `dev source sync is missing: ${required}`);
for (const forbidden of ['migrate reset', 'migrate down', 'docker compose down']) {
  assert(!devDeployScript.includes(forbidden), `dev deployment contains forbidden operation: ${forbidden}`);
}
assert(
  !devDeployScript.includes('--project-directory'),
  'dev deployment must not override the Compose project directory',
);
assert(
  devCompose.includes('context: "${DEV_WORKSPACE_PATH:?set the absolute dev workspace path}"'),
  'dev build context must be anchored to the validated absolute workspace path',
);
for (const control of [
  'DEV_INSTALL_DEPENDENCIES',
  'DEV_RUN_SEED',
  'DEV_BUILD_API_CLIENT',
  'DEV_GENERATE_PRISMA',
  'DEV_RUN_MIGRATIONS',
  'DEV_COMPILE_API',
  'DEV_API_SOURCE_HASH',
  'DEV_WRITE_RUNTIME_CONFIG',
]) {
  assert(
    devCompose.includes(`${control}: "\${${control}:-`),
    `shared dev bootstrap container is missing the ${control} control`,
  );
}
for (const required of [
  'MUSHROOM_ENVIRONMENT) == development',
  'COMPOSE_PROJECT_NAME) == mushroom-dev',
  'flock -w 600 9',
  'DEV_INSTALL_DEPENDENCIES',
  'DEV_RUN_SEED',
  'DEV_BUILD_API_CLIENT',
  'DEV_GENERATE_PRISMA',
  'DEV_RUN_MIGRATIONS',
  'DEV_COMPILE_API',
  'DEV_API_SOURCE_HASH',
  'apps/api/dist/.source.sha256',
  'DEV_WRITE_RUNTIME_CONFIG',
  'hash_frontend_inputs',
  'services+=(web)',
  'services+=(app)',
  'services+=(dashboard)',
  'probe api "http://$(env_value API_PORT)/v1/health/ready"',
  'probe_frontend web "http://$(env_value WEB_PORT)/"',
  'probe_frontend app "http://$(env_value APP_PORT)/"',
  'probe_frontend dashboard "http://$(env_value DASHBOARD_PORT)/"',
  'restarts={{.RestartCount}} oom={{.State.OOMKilled}}',
  'compose logs --no-color --tail 200 "$name"',
  'probe_hmr web "$(env_value PUBLIC_WEB_URL)"',
  'for attempt in {1..15}',
  'Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits',
]) assert(devDeployScript.includes(required), `dev deployment boundary is missing: ${required}`);
assert(
  devCompose.includes('SADAD_TRANSPORT_MODE: "${SADAD_TRANSPORT_MODE:-disabled}"'),
  'shared dev must keep Sadad disabled by default while allowing explicit activation',
);
assert(devCompose.includes('ports: []'), 'shared dev database must not publish a host port');
assert(devCompose.includes('postgres_data:'), 'shared dev requires its own project-scoped database volume');
assert(devCompose.includes('cap_drop: [ALL]'), 'shared dev Node services must drop Linux capabilities');
assert(
  devCompose.includes('NEXT_ALLOWED_DEV_ORIGINS: "${APP_ORIGINS:?set explicit dev browser origins}"'),
  'shared dev must pass its explicit browser origins to every Next watcher',
);
for (const config of nextConfigs) {
  assert(
    config.includes('allowedDevOriginsFromEnvironment'),
    'every Next application must normalize explicit remote/LAN development origins',
  );
}
for (const required of ['NEXT_ALLOWED_DEV_ORIGINS', 'new URL', '.hostname', 'new Set']) {
  assert(nextDevOriginConfig.includes(required), `Next development origin helper is missing: ${required}`);
}
for (const required of ['write_runtime_configs', 'apps/${application}/public/runtime-config.js']) {
  assert(devServiceScript.includes(required), `dev frontend runtime configuration is missing: ${required}`);
}
assert(
  devServiceScript.includes('pnpm --filter @sabz/app exec next dev --hostname 0.0.0.0 --port 3001'),
  'shared dev app must keep the default Next development watcher',
);
for (const memoryVariable of ['DEV_WEB_MEMORY', 'DEV_APP_MEMORY', 'DEV_DASHBOARD_MEMORY']) {
  assert(!devCompose.includes(memoryVariable), `shared dev frontend memory ceiling is forbidden: ${memoryVariable}`);
}
for (const required of [
  'NODE_OPTIONS=--max-old-space-size=640',
  'pnpm --filter @sabz-zendegi/api exec tsc -p tsconfig.build.json',
  '--noCheck --declaration false --declarationMap false',
  'exec node --enable-source-maps apps/api/dist/main.js',
]) assert(devServiceScript.includes(required), `dev API runtime separation is missing: ${required}`);
assert(
  !devServiceScript.includes('exec pnpm --filter @sabz-zendegi/api dev'),
  'shared dev API container must not retain the TypeScript compiler watcher',
);
assert(
  devDeployScript.includes('services+=(api)')
    && devDeployScript.includes('compose up -d --no-deps --force-recreate "${services[@]}"'),
  'an API source change must restart the compiled API runtime exactly once',
);
assert(
  devServiceScript.includes('local path="/run/secrets/${name,,}"'),
  'dev secret loader must map upper-case environment names to lower-case Compose secret paths',
);

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
run(process.execPath, ['--check', 'scripts/deploy-dev-vps.mjs']);
run('bash', ['-n', 'deploy/vps/deploy-release.sh']);
run('bash', ['-n', 'deploy/vps/deploy-dev.sh']);
run('bash', ['-n', 'deploy/vps/dev-service.sh']);
run('bash', ['-n', 'scripts/test-vps-dev.sh']);
run(process.execPath, ['scripts/test-next-dev-origins.mjs']);
run('bash', ['scripts/test-vps-dev.sh']);

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

const devScratch = mkdtempSync(join(tmpdir(), 'mushroom-dev-compose-'));
try {
  const devRoot = join(devScratch, 'dev').replaceAll('\\', '/');
  const secrets = join(devScratch, 'dev', 'secrets');
  mkdirSync(secrets, { recursive: true });
  for (const secret of [
    'postgres_password', 'database_url', 'jwt_access_secret', 'refresh_token_pepper',
    'payment_credential_encryption_key', 'payment_credential_decryption_keys',
  ]) writeFileSync(join(secrets, secret), 'synthetic');
  const envPath = join(devScratch, 'dev.env');
  writeFileSync(envPath, [
    'MUSHROOM_ENVIRONMENT=development',
    'COMPOSE_PROJECT_NAME=mushroom-dev',
    `MUSHROOM_ENV_ROOT=${devRoot}`,
    `DEV_WORKSPACE_PATH=${root.replaceAll('\\', '/')}`,
    `DEV_CACHE_PATH=${join(devScratch, 'cache').replaceAll('\\', '/')}`,
    'DEV_UID=1000',
    'DEV_GID=1000',
    'POSTGRES_DB=mushroom_dev',
    'POSTGRES_USER=mushroom_dev',
    'PUBLIC_API_URL=https://dev-api.example.test',
    'PUBLIC_WEB_URL=https://dev.example.test',
    'PUBLIC_APP_URL=https://dev-app.example.test',
    'PUBLIC_DASHBOARD_URL=https://dev-dashboard.example.test',
    'APP_ORIGINS=https://dev.example.test,https://dev-app.example.test,https://dev-dashboard.example.test',
    'TRUSTED_PROXIES=127.0.0.1/32',
    'API_PORT=127.0.0.1:3303',
    'WEB_PORT=127.0.0.1:3300',
    'APP_PORT=127.0.0.1:3301',
    'DASHBOARD_PORT=127.0.0.1:3302',
    '',
  ].join('\n'));
  const rendered = JSON.parse(run('docker', [
    'compose', '--profile', 'tools', '--env-file', envPath,
    '--file', 'deploy/vps/compose.dev.yaml', 'config', '--format', 'json',
  ]));
  assert(
    resolve(rendered.services.bootstrap.build.context) === root,
    `dev build context must resolve to the synced workspace, got ${rendered.services.bootstrap.build.context}`,
  );
  for (const service of ['web', 'app', 'dashboard']) {
    assert(
      !rendered.services[service].healthcheck,
      `${service} must be warmed by the serialized deployment probe, not a concurrent Docker healthcheck`,
    );
    assert(
      JSON.stringify(rendered.services[service].environment.NEXT_ALLOWED_DEV_ORIGINS.split(','))
        === JSON.stringify(['https://dev.example.test', 'https://dev-app.example.test', 'https://dev-dashboard.example.test']),
      `${service} must receive the exact configured dev browser origins`,
    );
  }
} finally {
  rmSync(devScratch, { recursive: true, force: true });
}

console.log('Release pipeline contract checks passed.');
