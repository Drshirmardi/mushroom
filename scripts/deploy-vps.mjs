import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const [action, environment, manifestArgument] = process.argv.slice(2);

if (
  !['deploy', 'rollback'].includes(action)
  || !['staging', 'production-sim'].includes(environment)
  || (action === 'deploy' && !manifestArgument)
) {
  console.error('Usage: node scripts/deploy-vps.mjs <deploy|rollback> <staging|production-sim> [manifest.json]');
  process.exit(2);
}

const requiredEnvironment = [
  'VPS_HOST',
  'VPS_USER',
  'VPS_SSH_KEY_PATH',
  'VPS_KNOWN_HOSTS_PATH',
  'GHCR_TOKEN',
  'GHCR_USERNAME',
  'GITHUB_RUN_ID',
];
for (const name of requiredEnvironment) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}

const safe = /^[A-Za-z0-9._-]+$/u;
const registryUser = /^(?:[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\[bot\])$/u;
for (const [name, value, pattern = safe] of [
  ['VPS_HOST', process.env.VPS_HOST],
  ['VPS_USER', process.env.VPS_USER],
  ['GHCR_USERNAME', process.env.GHCR_USERNAME, registryUser],
  ['GITHUB_RUN_ID', process.env.GITHUB_RUN_ID],
]) {
  if (!pattern.test(value)) throw new Error(`${name} contains unsupported characters`);
}

const port = process.env.VPS_PORT?.trim() || '22';
if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('VPS_PORT must be between 1 and 65535');
}

const root = resolve(import.meta.dirname, '..');
const composePath = resolve(root, 'deploy/vps/compose.yaml');
const deployScriptPath = resolve(root, 'deploy/vps/deploy-release.sh');
const manifestPath = action === 'deploy' ? resolve(manifestArgument) : null;
for (const file of [composePath, deployScriptPath, manifestPath].filter(Boolean)) {
  if (!existsSync(file)) throw new Error(`Required deployment input is missing: ${file}`);
}

const target = `${process.env.VPS_USER}@${process.env.VPS_HOST}`;
const remoteDirectory = `.mushroom-incoming/${process.env.GITHUB_RUN_ID}-${environment}`;
const sshOptions = [
  '-p', port,
  '-i', process.env.VPS_SSH_KEY_PATH,
  '-o', 'BatchMode=yes',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${process.env.VPS_KNOWN_HOSTS_PATH}`,
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
    input: options.input,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('ssh', [...sshOptions, target, `mkdir -p -- '${remoteDirectory}'`]);

const scpOptions = [
  '-P', port,
  '-i', process.env.VPS_SSH_KEY_PATH,
  '-o', 'BatchMode=yes',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${process.env.VPS_KNOWN_HOSTS_PATH}`,
];
const inputs = [composePath, deployScriptPath];
if (manifestPath) inputs.push(manifestPath);
run('scp', [...scpOptions, ...inputs, `${target}:${remoteDirectory}/`]);

const remoteManifest = manifestPath ? `${remoteDirectory}/${manifestPath.split(/[\\/]/u).at(-1)}` : '-';
const remoteCommand = [
  'bash',
  `${remoteDirectory}/deploy-release.sh`,
  action,
  environment,
  remoteManifest,
  `${remoteDirectory}/compose.yaml`,
  process.env.GHCR_USERNAME,
  remoteDirectory,
].map((part) => `'${part.replaceAll("'", "'\\''")}'`).join(' ');

run('ssh', [...sshOptions, target, remoteCommand], { input: process.env.GHCR_TOKEN });
