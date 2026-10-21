import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_offering_upgrade') {
  throw new Error('Offering upgrade proof requires empty disposable localhost:55419/patient_journey_offering_upgrade.');
}
const db = new Client({ connectionString: target.toString() });
await db.connect();
const root = new URL('../prisma/migrations/', import.meta.url);
const latest = '20261016180000_assessment_offering_drafts';
try {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0, 'Database must be empty.');
  const migrations = (await readdir(root)).filter(name => /^\d+_/.test(name) && name <= latest).sort();
  assert.equal(migrations.at(-1), latest);
  for (const name of migrations.filter(name => name !== latest)) await db.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
  const clinic = (await db.query("SELECT id FROM clinics WHERE status='ACTIVE' LIMIT 1")).rows[0].id;
  const user = randomUUID(), patient = randomUUID(), version = randomUUID(), active = randomUUID(), complete = randomUUID();
  await db.query("INSERT INTO users(id,phone,updated_at) VALUES($1,'+989112345679',now())", [user]);
  await db.query('INSERT INTO patient_profiles(id,user_id,clinic_id,updated_at) VALUES($1,$2,$3,now())', [patient, user, clinic]);
  await db.query("INSERT INTO assessment_versions(id,clinic_id,assessment_key,version_number,locale,title,structure,content_hash,status,published_at,updated_at) VALUES($1,$2,'MEZAJ',1,'x-offering-up','Synthetic',$3,$4,'PUBLISHED',now(),now())", [version, clinic, { schemaVersion: 1, sections: [] }, 'a'.repeat(64)]);
  await db.query('INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,answers,updated_at) VALUES($1,$2,$3,1,$4,now())', [active, patient, version, { q: true }]);
  const snapshot = { snapshotVersion: 1, answers: { q: true }, score: 2, resultBand: { id: 'only', title: 'Synthetic' } };
  await db.query("INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,state,answers,score,result_snapshot,completed_at,completion_idempotency_key,completion_payload_hash,updated_at) VALUES($1,$2,$3,2,'COMPLETE',$4,2,$5,now(),'legacy-completion',$6,now())", [complete, patient, version, { q: true }, snapshot, 'b'.repeat(64)]);
  await db.query('INSERT INTO mezaj_results(id,patient_id,assessment_version_id,assessment_submission_id,result_band_snapshot,assessed_at) VALUES($1,$2,$3,$4,$5,now())', [randomUUID(), patient, version, complete, snapshot.resultBand]);
  await db.query("INSERT INTO billing_intents(id,patient_id,clinic_id,purpose,amount_rial,actor_user_id,idempotency_key,fingerprint,updated_at) VALUES($1,$2,$3,'TOPUP',1000,$4,'legacy-topup',$5,now())", [randomUUID(), patient, clinic, user, 'c'.repeat(64)]);
  await db.query("INSERT INTO commerce_orders(id,clinic_id,patient_id,idempotency_key,shipping_method,subtotal_amount_toman,total_amount_toman,updated_at) VALUES($1,$2,$3,'legacy-order','PICKUP',123,123,now())", [randomUUID(), clinic, patient]);
  await db.query('INSERT INTO wallet_accounts(id,owner_key,clinic_id,patient_id,updated_at) VALUES($1,$2,$3,$4,now())', [randomUUID(), `patient:${patient}`, clinic, patient]);
  const tables = ['users', 'patient_profiles', 'assessment_versions', 'patient_assessment_submissions', 'mezaj_results', 'billing_intents', 'commerce_orders', 'wallet_accounts'];
  const before = new Map();
  // Fixed table allowlist; there are no runtime/user-controlled SQL identifiers.
  for (const table of tables) before.set(table, (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows);
  await db.query(await readFile(new URL(`${latest}/migration.sql`, root), 'utf8'));
  for (const table of tables) assert.deepEqual((await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows, before.get(table), `Legacy ${table} changed`);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM assessment_offering_versions')).rows[0].n, 0);
  const offering = randomUUID();
  await db.query("INSERT INTO assessment_offering_versions(id,clinic_id,offering_key,version_number,kind,title,locale,assessment_version_id,price_mode,amount_rial,currency,created_by_user_id,idempotency_key,payload_hash) VALUES($1,$2,'INDIVIDUAL_DRAFT',1,'INDIVIDUAL','Synthetic','x-offering-up',$3,'FREE',0,'IRR',$4,'offering-draft',$5)", [offering, clinic, version, user, 'd'.repeat(64)]);
  await assert.rejects(db.query("UPDATE assessment_offering_versions SET title='Rewrite' WHERE id=$1", [offering]), /immutable/);
  await assert.rejects(db.query("UPDATE assessment_offering_versions SET status='PUBLISHED' WHERE id=$1", [offering]));
  await assert.rejects(db.query('DELETE FROM assessment_offering_versions WHERE id=$1', [offering]), /retained/);
  assert.deepEqual((await db.query('SELECT result_snapshot FROM patient_assessment_submissions WHERE id=$1', [complete])).rows[0].result_snapshot, snapshot);
  console.log(`PASS: ${migrations.length} migrations; legacy patient/assessment/result/billing/order/wallet rows unchanged; new offerings empty and immutable/publication-blocked.`);
} finally { await db.end(); }
