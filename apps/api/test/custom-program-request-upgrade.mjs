import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_custom_request_upgrade') throw new Error('Disposable populated63 custom request upgrade clone:55419 required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.custom_program_requests') AS relation")).rows[0].relation, null);
  for (const name of ['assessment_access_grants', 'couple_assessment_joint_results', 'assessment_care_shares', 'program_definition_versions', 'program_offering_publications', 'program_purchases', 'program_access_grants']) assert.ok((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n > 0, `Populated ${name} proof required`);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r => r.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); return (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  const readable = async () => (await db.query('SELECT id,program_grant_readable(id,patient_id) AS allowed FROM program_access_grants ORDER BY id')).rows;
  const individual = async () => (await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows;
  const programProof = await readable(), assessmentProof = await individual();
  for (const file of ['20261018002000_custom_program_request_care', '20261018003000_custom_care_final_shape']) await db.query(await readFile(new URL(`../prisma/migrations/${file}/migration.sql`, import.meta.url), 'utf8'));
  for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Custom request migration changed existing ${name}`);
  for (const name of ['custom_program_requests', 'custom_program_care_authorizations']) assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n, 0);
  assert.deepEqual(await readable(), programProof); assert.deepEqual(await individual(), assessmentProof);
  console.log(`PASS: populated63-to65 preserves every row across ${names.length} existing tables and prior paid program/assessment readability; new request/care ledgers empty.`);
} finally { await db.end(); }
