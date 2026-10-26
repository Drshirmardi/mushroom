import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_program_publication_upgrade') throw new Error('Disposable populated59 clone localhost:55419/patient_journey_program_publication_upgrade required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.program_offering_publications') AS relation")).rows[0].relation, null);
  for (const name of ['assessment_access_grants', 'couple_assessment_joint_results', 'assessment_care_shares', 'program_definition_versions']) assert.ok((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n > 0, `Populated ${name} proof required`);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r => r.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); return (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  const grants = (await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows;
  const programs = (await db.query('SELECT id,program_definition_usable(id) AS usable FROM program_definition_versions ORDER BY id')).rows;
  await db.query(await readFile(new URL('../prisma/migrations/20261017010000_program_commercial_publication/migration.sql', import.meta.url), 'utf8'));
  for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Program migration changed existing ${name}`);
  assert.deepEqual((await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows, grants);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM program_offering_publications')).rows[0].n, 0);
  assert.deepEqual((await db.query('SELECT id,program_definition_usable(id) AS usable FROM program_definition_versions ORDER BY id')).rows, programs);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM consent_policy_versions WHERE policy_key='PROGRAM_PURCHASE_TERMS'")).rows[0].n, 0);
  console.log(`PASS: populated59-to60 preserves every row across ${names.length} existing tables, paid readability, populated individual/couple/care evidence; program offerings empty by default.`);
} finally { await db.end(); }
