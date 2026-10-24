import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { Client } = require('pg'); const dotenv = require('dotenv');
const settings = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
const original = new URL(process.env.DATABASE_URL ?? settings.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(original.hostname)) throw new Error('Local PostgreSQL required');
const name = `patient_entry_verify_${randomUUID().replaceAll('-', '')}`;
const adminUrl = new URL(original); adminUrl.pathname = '/postgres';
const target = new URL(original); target.pathname = `/${name}`;
const env = { ...settings, ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test', PATIENT_ENTRY_TEST_ISOLATED: '1', LOG_LEVEL: 'fatal' };
env.DEV_DASHBOARD_ADMIN_PHONE = '';
env.DEV_DASHBOARD_ADMIN_PASSWORD = '';
const logDirectory = new URL('../../../.local/', import.meta.url);
mkdirSync(logDirectory, { recursive: true });
const logFile = new URL(name + '.log', logDirectory);
writeFileSync(logFile, '');
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: new URL('../', import.meta.url), env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; const capture = value => { appendFileSync(logFile, value); output = (output + value).slice(-10000); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  child.once('error', reject); child.once('exit', code => {
    if (code === 0) { console.log(args[0].includes('vitest') ? output.slice(-2500) : 'PASS disposable database preparation'); resolve(); }
    else { console.error(output.slice(-6500)); reject(new Error(`Entry verification exited ${code}`)); }
  });
});
const connection = new Client({ connectionString: adminUrl.toString() }); await connection.connect();
let created = false;
try {
  await connection.query(`CREATE DATABASE "${name}"`); created = true;
  await run([require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  await run(['prisma/seed.mjs']);
  const vitest = require.resolve('vitest/package.json').replace(/package\.json$/, 'vitest.mjs');
  if (process.argv.includes('--full')) await run([vitest, 'run', 'test/reminders.integration.spec.ts', '--no-file-parallelism']);
  await run([vitest, 'run', ...(process.argv.includes('--full') ? ['--exclude', 'test/reminders.integration.spec.ts', '--exclude', 'test/chat-capacity.load.spec.ts', '--exclude', 'test/phase-12-release-capacity.load.spec.ts', '--exclude', 'test/phase-12-performance-tuning.integration.spec.ts'] : process.argv.slice(2).length ? process.argv.slice(2) : ['test/patient-entry.integration.spec.ts']), '--no-file-parallelism']);
} finally {
  if (created && /^patient_entry_verify_[a-f0-9]{32}$/.test(name)) { await connection.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]); await connection.query(`DROP DATABASE "${name}"`); }
  await connection.end();
}
