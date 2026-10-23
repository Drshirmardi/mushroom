import { createHash, createPublicKey, generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const state = resolve(root, '.local/chat');
const lock = resolve(state, 'dev.lock');
const instance = createHash('sha256').update(root).digest('hex').slice(0, 12);
const children = new Set();
let stopping = false;
let ownsLock = false;
let composeStarted = false;
let composeEnvironment;

function terminate(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    killer.on('error', () => child.kill());
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already exited. */ }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  process.exitCode = signal === 'SIGINT' ? 130 : 143;
  children.forEach(terminate);
});

function run(command, args, env = process.env, quiet = false, timeout = 0) {
  if (stopping && command !== 'docker') return Promise.reject(new Error('Development startup cancelled.'));
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root, env, stdio: quiet ? 'ignore' : 'inherit',
      windowsHide: true, detached: process.platform !== 'win32',
    });
    children.add(child);
    let timedOut = false;
    const timer = timeout ? setTimeout(() => { timedOut = true; terminate(child); }, timeout) : undefined;
    child.once('error', () => {
      children.delete(child); clearTimeout(timer);
      reject(new Error(`Cannot start ${command}. Check that it is installed and available.`));
    });
    child.once('close', code => {
      children.delete(child); clearTimeout(timer);
      code === 0 && !timedOut ? resolveRun() : reject(new Error(timedOut ? `${command} did not respond within ${timeout / 1000} seconds.` : `${command} exited unsuccessfully; development startup stopped.`));
    });
  });
}
const compose = (...args) => run('docker', [
  'compose', '--project-name', `mushroom-chat-${instance}`, '--project-directory', root,
  '--file', resolve(root, 'deploy/ejabberd/compose.local.yaml'), ...args,
], composeEnvironment);
const port = (raw, fallback) => {
  const value = String(raw || fallback);
  if (!/^\d+$/u.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error('Development ports must be integers between 1 and 65535.');
  return value;
};

function claim() {
  mkdirSync(state, { recursive: true, mode: 0o700 });
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8').trim());
    if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('Invalid local development lock; inspect .local/chat/dev.lock.');
    try { process.kill(pid, 0); throw new Error('pnpm dev is already running for this checkout.'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    unlinkSync(lock);
  }
  writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
  ownsLock = true;
}

function prepareSecrets() {
  const path = resolve(state, 'credentials.json');
  if (!existsSync(path)) writeFileSync(path, JSON.stringify({
    sqlPassword: randomBytes(32).toString('base64url'), policySecret: randomBytes(32).toString('base64url'),
  }), { flag: 'wx', mode: 0o600 });
  let credentials;
  try { credentials = JSON.parse(readFileSync(path, 'utf8')); }
  catch { throw new Error('Local chat credentials cannot be read; restore .local/chat from your local backup.'); }
  if (!credentials || ![credentials.sqlPassword, credentials.policySecret].every(value => typeof value === 'string' && /^[\w-]{43}$/u.test(value)) || credentials.sqlPassword === credentials.policySecret) {
    throw new Error('Local chat credentials are invalid; restore .local/chat from your local backup.');
  }
  const privateKey = resolve(state, 'private.pem');
  const publicKey = resolve(state, 'public.pem');
  if (!existsSync(privateKey)) {
    if (existsSync(publicKey)) throw new Error('Local chat private key is missing; restore it before continuing.');
    const pair = generateKeyPairSync('rsa', {
      modulusLength: 3072,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    writeFileSync(privateKey, pair.privateKey, { flag: 'wx', mode: 0o600 });
    writeFileSync(publicKey, pair.publicKey, { flag: 'wx', mode: 0o644 });
  }
  const expected = createPublicKey(readFileSync(privateKey)).export({ type: 'spki', format: 'pem' });
  if (!existsSync(publicKey)) writeFileSync(publicKey, expected, { flag: 'wx', mode: 0o644 });
  if (createPublicKey(readFileSync(publicKey)).export({ type: 'spki', format: 'pem' }) !== expected) throw new Error('Local chat signing keys do not match.');
  // ejabberd's jwt_key loader accepts JSON JWK, not PEM.
  const jwkPath = resolve(state, 'public.jwk');
  const jwk = JSON.stringify({ ...createPublicKey(expected).export({ format: 'jwk' }), alg: 'RS256', use: 'sig' }) + '\n';
  if (!existsSync(jwkPath) || readFileSync(jwkPath, 'utf8') !== jwk) writeFileSync(jwkPath, jwk, { mode: 0o644 });
  return { ...credentials, privateKey };
}

try {
  const load = path => existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
  const api = { ...load(resolve(root, '.env')), ...load(resolve(root, 'apps/api/.env')), ...process.env };
  if ((api.NODE_ENV && api.NODE_ENV !== 'development') || (api.MUSHROOM_ENVIRONMENT && !['dev', 'development'].includes(api.MUSHROOM_ENVIRONMENT))) {
    throw new Error('pnpm dev starts local services only. Use the deployment profile for other environments.');
  }
  if (!process.env.npm_execpath) throw new Error('Start development with pnpm dev.');
  const apiPort = port(api.PORT, 3003);
  const wsPort = port(api.DEV_CHAT_WS_PORT, 5444);
  const adminPort = port(api.DEV_CHAT_ADMIN_PORT, 5445);
  if (new Set([apiPort, wsPort, adminPort]).size !== 3) throw new Error('API and chat ports must be different.');
  claim();
  console.log('[dev] Preparing local chat. Docker Desktop/Engine must be running.');
  try {
    await run('docker', ['--version'], process.env, true, 10_000);
  } catch { throw new Error('Docker CLI is unavailable. Install Docker Desktop/Engine and reopen the terminal.'); }
  try {
    await run('docker', ['compose', 'version'], process.env, true, 10_000);
  } catch { throw new Error('Docker Compose v2 is unavailable. Enable/install the Compose plugin before running pnpm dev.'); }
  try {
    await run('docker', ['info', '--format', '{{.ServerVersion}}'], process.env, true, 15_000);
  } catch (error) { throw new Error(`Docker CLI and Compose are installed, but the engine is not responding. ${error.message} Wait for Docker Desktop to report Engine running; if it stays stuck, restart Docker Desktop, then retry pnpm dev.`); }
  if (stopping) throw new Error('Development startup cancelled.');
  const secrets = prepareSecrets();
  composeEnvironment = {
    ...process.env,
    DEV_CHAT_INSTANCE: instance, DEV_CHAT_SOURCE_ROOT: root.split(sep).join('/'), DEV_CHAT_STATE_ROOT: state.split(sep).join('/'),
    DEV_CHAT_API_PORT: apiPort, DEV_CHAT_WS_PORT: wsPort, DEV_CHAT_ADMIN_PORT: adminPort,
    DEV_CHAT_SQL_PASSWORD: secrets.sqlPassword, DEV_CHAT_POLICY_SECRET: secrets.policySecret,
  };
  composeStarted = true;
  // A stopped project keeps its volumes and credentials; never reset SQL on startup.
  await compose('up', '--detach', '--build', '--wait', '--wait-timeout', '120');
  if (stopping) throw new Error('Development startup cancelled.');
  const environment = {
    ...process.env, NODE_ENV: 'development', PORT: apiPort, HOSTNAME: '0.0.0.0',
    EJABBERD_DOMAIN: 'chat.localhost', EJABBERD_WEBSOCKET_URL: `ws://127.0.0.1:${wsPort}/xmpp-websocket`,
    EJABBERD_API_URL: `http://127.0.0.1:${adminPort}/api/v2`, EJABBERD_POLICY_SECRET: secrets.policySecret,
    EJABBERD_JWT_PRIVATE_KEY_FILE: secrets.privateKey, EJABBERD_REQUEST_TIMEOUT_MS: '3000',
  };
  console.log('[dev] Chat dependencies are running. Preparing the shared client, then starting applications.');
  await run(process.execPath, [process.env.npm_execpath, '--filter', '@sabz-zendegi/api-client', 'build'], environment);
  await run(process.execPath, [process.env.npm_execpath, 'exec', 'turbo', 'dev', ...process.argv.slice(2)], environment);
} catch (error) {
  if (!stopping) { console.error(`[dev] ${error.message}`); process.exitCode = 1; }
} finally {
  if (composeStarted) {
    console.log('[dev] Stopping local chat containers; data and keys are retained.');
    try { await compose('stop', '--timeout', '5'); }
    catch { console.error('[dev] Chat shutdown could not complete. Check the local Docker project; no volumes were removed.'); }
  }
  if (ownsLock) unlinkSync(lock);
}
