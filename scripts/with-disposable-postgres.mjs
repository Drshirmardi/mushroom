import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const apiRequire = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = apiRequire('pg');

const mode = process.argv[2];
const commands = {
  workspace: ['exec', 'turbo', 'test'],
  reminders: ['--filter', '@sabz-zendegi/api', 'exec', 'vitest', 'run', 'test/migrations.integration.spec.ts', 'test/chat-migrations.integration.spec.ts', 'test/reminders.integration.spec.ts', '--no-file-parallelism'],
  outboxAfterChat: ['--filter', '@sabz-zendegi/api', 'exec', 'vitest', 'run', 'test/chat-rest.integration.spec.ts', 'test/outbox.integration.spec.ts', '--no-file-parallelism'],
  chatRevalidation: ['--filter', '@sabz-zendegi/api', 'exec', 'vitest', 'run', 'test/chat-realtime.gateway.spec.ts', 'test/chat-reconnect-load.spec.ts', 'test/chat-authorization.integration.spec.ts', 'test/chat-moderation.integration.spec.ts', 'test/chat-abuse-authorization.integration.spec.ts', 'test/chat-ordering.integration.spec.ts', 'test/chat-presence.gateway.spec.ts', 'test/chat-rate-limit.integration.spec.ts', '--no-file-parallelism'],
};
const command = commands[mode];

if (!command) {
  throw new Error('Choose the disposable PostgreSQL verification mode: workspace, reminders, or outboxAfterChat.');
}

const parentDatabaseUrl = process.env.DATABASE_URL;
if (!parentDatabaseUrl) {
  throw new Error('DATABASE_URL must be supplied by the parent process for disposable PostgreSQL verification.');
}

let parentUrl;
try {
  parentUrl = new URL(parentDatabaseUrl);
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
}
if (!['postgres:', 'postgresql:'].includes(parentUrl.protocol)) {
  throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
}

const databaseName = `sabz_zendegi_verify_${randomUUID().replaceAll('-', '')}`;
const safeDatabaseName = /^sabz_zendegi_verify_[a-f0-9]{32}$/;
if (!safeDatabaseName.test(databaseName)) {
  throw new Error('Refusing to use an unsafe disposable database name.');
}

const disposableUrl = new URL(parentUrl);
disposableUrl.pathname = `/${databaseName}`;
const adminUrl = new URL(parentUrl);
adminUrl.pathname = '/postgres';
const pnpmEntrypoint = process.env.npm_execpath;
if (!pnpmEntrypoint) {
  throw new Error('The disposable PostgreSQL harness must be started through pnpm.');
}

function run(args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pnpmEntrypoint, ...args], { cwd: process.cwd(), env: environment, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(signal ? `Verification command stopped by ${signal}.` : `Verification command exited with ${code ?? 'an unknown code'}.`));
    });
  });
}

async function cleanup() {
  if (!safeDatabaseName.test(databaseName)) throw new Error('Refusing to clean up an unsafe database name.');
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [databaseName]);
    await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await client.end();
  }
}

const verificationEnvironment = { ...process.env, DATABASE_URL: disposableUrl.toString() };
let created = false;
try {
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
  } finally {
    await admin.end();
  }

  await run(['--filter', '@sabz-zendegi/api', 'prisma:migrate:deploy'], verificationEnvironment);
  await run(['--filter', '@sabz-zendegi/api', 'prisma:seed'], verificationEnvironment);
  await run(command, verificationEnvironment);
} finally {
  if (created) await cleanup();
}
