import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_care_upgrade') throw new Error('Disposable populated56 clone localhost:55419/patient_journey_care_upgrade required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.assessment_care_shares') AS relation")).rows[0].relation, null);
  assert.ok((await db.query('SELECT count(*)::int AS n FROM assessment_access_grants')).rows[0].n > 0, 'Clone accepted populated C04 upgrade proof first.');
  assert.ok((await db.query("SELECT count(*)::int AS n FROM couple_result_protocol_versions WHERE status='APPROVED'")).rows[0].n > 0);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r => r.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); return (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  const readable = (await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows;
  for (const migration of ['20261017007000_assessment_assigned_care_sharing', '20261017008000_assessment_care_withdrawal_evidence']) await db.query(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), 'utf8'));
  for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Care-sharing migration changed existing ${name}`);
  assert.deepEqual((await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows, readable);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM assessment_care_shares')).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM consent_policy_versions WHERE policy_key='ASSESSMENT_CARE_SHARING'")).rows[0].n, 0);
  console.log(`PASS: populated56-to58 preserves every row across ${names.length} existing tables and prior paid readability; care-sharing ledger and real legal policy remain absent by default.`);
} finally { await db.end(); }
