import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_program_purchase_upgrade') throw new Error('Disposable populated60 program purchase upgrade clone:55419 required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.program_purchases') AS relation")).rows[0].relation, null);
  for (const name of ['assessment_access_grants', 'couple_assessment_joint_results', 'assessment_care_shares', 'program_definition_versions', 'program_offering_publications']) assert.ok((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n > 0, `Populated ${name} proof required`);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r => r.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); const projection = name === 'billing_intents' ? "to_jsonb(t)-'program_purchase_id'" : 'to_jsonb(t)'; return (await db.query(`SELECT ${projection} AS row FROM "${name}" t ORDER BY (${projection})::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  const grants = (await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows;
  const programs = (await db.query('SELECT id,program_definition_usable(id) AS usable FROM program_definition_versions ORDER BY id')).rows;
  const publications = (await db.query('SELECT id,program_publication_current(id) AS usable FROM program_offering_publications ORDER BY id')).rows;
  for (const file of ['20261017011000_ready_program_purchase_access', '20261018000000_program_purchase_audit_uuid', '20261018001000_program_access_creation_boundaries']) await db.query(await readFile(new URL(`../prisma/migrations/${file}/migration.sql`, import.meta.url), 'utf8'));
  for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Program access migration changed existing ${name}`);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM billing_intents WHERE program_purchase_id IS NOT NULL')).rows[0].n, 0);
  for (const name of ['program_purchases', 'program_access_grants']) assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n, 0);
  assert.deepEqual((await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows, grants);
  assert.deepEqual((await db.query('SELECT id,program_definition_usable(id) AS usable FROM program_definition_versions ORDER BY id')).rows, programs);
  assert.deepEqual((await db.query('SELECT id,program_publication_current(id) AS usable FROM program_offering_publications ORDER BY id')).rows, publications);
  console.log(`PASS: populated60-to63 preserves all rows across ${names.length} tables, prior paid readability/program readiness; every old billing program FK NULL, new purchases/grants empty.`);
} finally { await db.end(); }
