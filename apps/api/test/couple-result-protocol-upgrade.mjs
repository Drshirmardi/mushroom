import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

// Clone the accepted populated P02 proof inside the task-owned container; never a persistent DB.
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_couple_protocol_upgrade') throw new Error('Disposable populated clone localhost:55419/patient_journey_couple_protocol_upgrade required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('public.couple_result_protocol_versions') AS relation")).rows[0].relation, null, 'Migration52 must not already be applied.');
  assert.ok((await db.query('SELECT count(*)::int AS n FROM assessment_purchases')).rows[0].n > 0, 'Accepted P02 populated proof must be cloned first.');
  assert.ok((await db.query('SELECT count(*)::int AS n FROM assessment_access_grants')).rows[0].n > 0);
  assert.ok((await db.query("SELECT 1 FROM pg_trigger WHERE tgname='assessment_paid_attempt_retention_guard'")).rowCount, 'Migration51 required.');
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(row => row.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); return (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  await db.query('BEGIN');
  try {
    await db.query(await readFile(new URL('../prisma/migrations/20261017002000_couple_result_protocol/migration.sql', import.meta.url), 'utf8'));
    for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Joint protocol migration changed existing ${name}`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM couple_result_protocol_versions')).rows[0].n, 0);
    assert.equal((await db.query('SELECT couple_result_protocol_usable($1::uuid) AS usable', ['00000000-0000-4000-8000-000000000001'])).rows[0].usable, false);
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  console.log(`PASS: populated51-to52 upgrade preserves every row across ${names.length} existing tables, including paid/withdrawn private attempts, wallet/order/booking/couple/content/protocol history; joint configuration starts empty and unavailable.`);
} finally { await db.end(); }
