import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Client } from 'pg';

const source = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(source.hostname)) throw Error('Local PostgreSQL required for disposable commerce verification.');
const name = `store_mezaj_verify_${randomUUID().replaceAll('-', '')}`;
if (!/^store_mezaj_verify_[a-f0-9]{32}$/.test(name)) throw Error('Invalid disposable database name.');
const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
const target = new URL(source); target.pathname = `/${name}`;
const env = { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test', LOG_LEVEL: 'fatal', STORE_MEZAJ_TEST_ISOLATED: '1' };
env.DEV_DASHBOARD_ADMIN_PHONE = ''; env.DEV_DASHBOARD_ADMIN_PASSWORD = '';
const admin = new Client({ connectionString: adminUrl.toString() }); await admin.connect();
let created = false;
async function run(args) {
  if (!process.env.npm_execpath) throw Error('Run through the package script.');
  await new Promise((resolve, reject) => { const child = spawn(process.execPath, [process.env.npm_execpath, ...args], { cwd: process.cwd(), env, stdio: 'inherit' }); child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error(`Verification exited ${code}`))); });
}
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true;
  const db = new Client({ connectionString: target.toString() }); await db.connect();
  try {
    const root = new URL('../prisma/migrations/', import.meta.url);
    const migrations = (await readdir(root)).filter(n => /^\d+_/.test(n)).sort();
    const latest = '20261020010000_commerce_mezaj_collections';
    assert.equal(migrations.at(-1), latest);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
    for (const migration of migrations.filter(n => n !== latest)) await db.query(await readFile(new URL(`${migration}/migration.sql`, root), 'utf8'));
    await run(['exec', 'node', 'prisma/seed.mjs']);
    const before = (await db.query('SELECT id,patient_id,assessment_submission_id,result_band_snapshot FROM mezaj_results ORDER BY id')).rows;
    const catalogBefore = (await db.query('SELECT * FROM commerce_products ORDER BY id')).rows;
    assert.ok(catalogBefore.length > 0);
    await db.query(await readFile(new URL(`${latest}/migration.sql`, root), 'utf8'));
    assert.deepEqual((await db.query('SELECT id,patient_id,assessment_submission_id,result_band_snapshot FROM mezaj_results ORDER BY id')).rows, before);
    assert.deepEqual((await db.query('SELECT * FROM commerce_products ORDER BY id')).rows, catalogBefore);
    console.log(`Fresh schema + additive upgrade applied: ${migrations.length} migrations; ${catalogBefore.length} existing products preserved.`);
  } finally { await db.end(); }
  await run(['exec', 'vitest', 'run', 'test/commerce-mezaj.integration.spec.ts', 'test/patient-commerce-catalog.integration.spec.ts', '--no-file-parallelism']);
  await run(['exec', 'prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']);
} finally {
  if (created) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [name]); await admin.query(`DROP DATABASE "${name}"`); }
  await admin.end();
}
