import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const [sourceSha] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? '')) {
  console.error('Usage: node scripts/deploy-dev-vps.mjs <40-character-source-sha>');
  process.exit(2);
}

for (const name of ['VPS_HOST', 'VPS_USER', 'VPS_SSH_KEY_PATH', 'VPS_KNOWN_HOSTS_PATH']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}

const safe = /^[A-Za-z0-9._-]+$/u;
for (const name of ['VPS_HOST', 'VPS_USER']) {
  if (!safe.test(process.env[name])) throw new Error(`${name} contains unsupported characters`);
}

const port = process.env.VPS_PORT?.trim() || '22';
if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('VPS_PORT must be between 1 and 65535');
}

const root = resolve(import.meta.dirname, '..');
for (const file of [
  'deploy/vps/Dockerfile.dev',
  'deploy/vps/compose.dev.yaml',
  'deploy/vps/deploy-dev.sh',
  'deploy/vps/dev-service.sh',
].map((path) => resolve(root, path))) {
  if (!existsSync(file)) throw new Error(`Required dev deployment input is missing: ${file}`);
}
for (const name of ['VPS_SSH_KEY_PATH', 'VPS_KNOWN_HOSTS_PATH']) {
  if (!existsSync(process.env[name])) throw new Error(`${name} does not point to a file`);
}

const target = `${process.env.VPS_USER}@${process.env.VPS_HOST}`;
const sshOptions = [
  '-p', port,
  '-i', process.env.VPS_SSH_KEY_PATH,
  '-o', 'BatchMode=yes',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'ConnectTimeout=20',
  '-o', 'KexAlgorithms=curve25519-sha256',
  '-o', 'IPQoS=none',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${process.env.VPS_KNOWN_HOSTS_PATH}`,
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('ssh', [...sshOptions, target, 'install -d -m 700 "$HOME/mushroom/dev" "$HOME/mushroom/dev/workspace" "$HOME/mushroom/dev/cache" "$HOME/mushroom/dev/state"']);
run('ssh', [...sshOptions, target,
  'flock -w 600 "$HOME/mushroom/dev/state/deploy.lock" true || { printf "timed out waiting to upload dev source\\n" >&2; exit 1; }',
]);

const rsyncShell = [
  'ssh', ...sshOptions,
].map((part) => `'${part.replaceAll("'", "'\\''")}'`).join(' ');
run('rsync', [
  '--archive',
  '--checksum',
  '--compress',
  '--delete-delay',
  '--delay-updates',
  '--no-perms',
  '--no-owner',
  '--no-group',
  '--exclude=/.git/',
  '--exclude=**/node_modules/',
  '--exclude=**/.next/',
  '--exclude=**/dist/',
  '--exclude=/apps/api/src/generated/',
  '--exclude=/apps/web/public/runtime-config.js',
  '--exclude=/apps/app/public/runtime-config.js',
  '--exclude=/apps/dashboard/public/runtime-config.js',
  '--exclude=**/.turbo/',
  '--exclude=**/.env',
  '--exclude=**/.env.*',
  '--exclude=**/*.log',
  '-e', rsyncShell,
  `${root}/`,
  `${target}:mushroom/dev/workspace/`,
]);

const remoteCommand = `bash "$HOME/mushroom/dev/workspace/deploy/vps/deploy-dev.sh" '${sourceSha}'`;
run('ssh', [...sshOptions, target, remoteCommand]);
