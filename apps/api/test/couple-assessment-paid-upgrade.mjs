import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_couple_paid_upgrade_final') throw new Error('Disposable populated53 clone localhost:55419/patient_journey_couple_paid_upgrade_final required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.couple_assessment_joint_results') AS relation")).rows[0].relation, null);
  assert.ok((await db.query('SELECT count(*)::int AS n FROM assessment_access_grants')).rows[0].n > 0, 'Clone the accepted populated C03 upgrade proof first.');
  assert.ok((await db.query("SELECT count(*)::int AS n FROM couple_result_protocol_versions WHERE status='APPROVED'")).rows[0].n > 0);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(row => row.table_name);
  async function rows(name) {
    assert.match(name, /^[a-z0-9_]+$/i);
    const added = name === 'assessment_access_grants' ? ['couple_assessment_participant_id'] : name === 'assessment_purchases' ? ['couple_assessment_session_id'] : [];
    return (await db.query(`SELECT to_jsonb(t)-$1::text[] AS row FROM "${name}" t ORDER BY (to_jsonb(t)-$1::text[])::text`, [added])).rows;
  }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  const accessBefore = (await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows;
  for (const migration of ['20261017004000_couple_paid_assessment_delivery', '20261017005000_assessment_source_guard_binding', '20261017006000_joint_source_metadata_minimization']) await db.query(await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), 'utf8'));
  for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Coupled paid migration changed existing ${name}`);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM couple_assessment_joint_results')).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM assessment_access_grants WHERE couple_assessment_participant_id IS NOT NULL')).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM assessment_purchases WHERE couple_assessment_session_id IS NOT NULL')).rows[0].n, 0);
  assert.deepEqual((await db.query('SELECT id,assessment_grant_readable(id,patient_id) AS allowed FROM assessment_access_grants ORDER BY id')).rows, accessBefore);
  console.log(`PASS: populated53-to56 preserves every row across ${names.length} existing tables; individual payment/access proofs remain valid; new coupled references null and retained joint ledger empty. No clinical/legal data or entitlement inferred.`);
} finally { await db.end(); }
