import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [mode] = process.argv.slice(2);
if (!['disabled', 'live'].includes(mode)) {
  console.error('Usage: node scripts/set-dev-sms-runtime.mjs <disabled|live>');
  process.exit(2);
}

for (const name of ['VPS_HOST', 'VPS_USER', 'VPS_SSH_KEY_PATH', 'VPS_KNOWN_HOSTS_PATH']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}
if (!existsSync(process.env.VPS_SSH_KEY_PATH) || !existsSync(process.env.VPS_KNOWN_HOSTS_PATH)) {
  throw new Error('Pinned SSH material is unavailable');
}

const safe = /^[A-Za-z0-9._-]+$/u;
if (!safe.test(process.env.VPS_HOST) || !safe.test(process.env.VPS_USER)) {
  throw new Error('VPS host or user contains unsupported characters');
}
const port = process.env.VPS_PORT?.trim() || '22';
if (!/^\d{1,5}$/u.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('VPS_PORT must be between 1 and 65535');
}

const remote = [
  `mode=${mode}`,
  'runtime_env="$HOME/mushroom/dev/runtime.env"',
  'test -f "$runtime_env"',
  'sed -i "s/^SMS_TRANSPORT_MODE=.*/SMS_TRANSPORT_MODE=${mode}/" "$runtime_env"',
  'grep -qx "SMS_TRANSPORT_MODE=${mode}" "$runtime_env"',
].join('; ');
const result = spawnSync('ssh', [
  '-p', port,
  '-i', process.env.VPS_SSH_KEY_PATH,
  '-o', 'BatchMode=yes',
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', `UserKnownHostsFile=${process.env.VPS_KNOWN_HOSTS_PATH}`,
  `${process.env.VPS_USER}@${process.env.VPS_HOST}`,
  remote,
], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Shared dev SMS runtime mode set to ${mode}.`);
