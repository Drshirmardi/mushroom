import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_couple_upgrade') throw new Error('Couple upgrade proof requires empty disposable localhost:55419/patient_journey_couple_upgrade.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
const root = new URL('../prisma/migrations/', import.meta.url), latest = '20261016190000_couple_account_link';
try {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  const migrations = (await readdir(root)).filter(name => /^\d+_/.test(name) && name <= latest).sort(); assert.equal(migrations.at(-1), latest);
  for (const name of migrations.filter(name => name !== latest)) await db.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
  const clinic = (await db.query("SELECT id FROM clinics WHERE status='ACTIVE' LIMIT 1")).rows[0].id;
  const people = [];
  for (let i = 0; i < 2; i++) {
    const user = randomUUID(), patient = randomUUID(), session = randomUUID(), intake = randomUUID(); people.push({ user, patient, session });
    await db.query('INSERT INTO users(id,phone,updated_at) VALUES($1,$2,now())', [user, `+98911234567${i}`]);
    await db.query('INSERT INTO patient_profiles(id,user_id,clinic_id,updated_at) VALUES($1,$2,$3,now())', [patient, user, clinic]);
    await db.query("INSERT INTO sessions(id,user_id,refresh_token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')", [session, user, String(i + 1).repeat(64)]);
    await db.query('INSERT INTO patient_medical_intakes(id,patient_id,clinic_id,current_revision_number,updated_at) VALUES($1,$2,$3,1,now())', [intake, patient, clinic]);
    await db.query("INSERT INTO patient_medical_intake_revisions(id,intake_id,revision_number,assigned_schema_version,revision_state,birth_date,recording_mode,reported_patient_id,payload_hash) VALUES($1,$2,1,1,'DRAFT','1990-01-01','PATIENT_ENTRY',$3,$4)", [randomUUID(), intake, patient, 'a'.repeat(64)]);
  }
  const [a, b] = people; const version = randomUUID(), submission = randomUUID();
  await db.query("INSERT INTO assessment_versions(id,clinic_id,assessment_key,version_number,locale,title,structure,content_hash,status,published_at,updated_at) VALUES($1,$2,'MEZAJ',1,'x-couple-up','Synthetic',$3,$4,'PUBLISHED',now(),now())", [version, clinic, { schemaVersion: 1, sections: [] }, 'a'.repeat(64)]);
  const snapshot = { snapshotVersion: 1, answers: { q: true }, score: 2, resultBand: { id: 'one', title: 'Synthetic' } };
  await db.query("INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,state,answers,score,result_snapshot,completed_at,completion_idempotency_key,completion_payload_hash,updated_at) VALUES($1,$2,$3,'COMPLETE',$4,2,$5,now(),'legacy-completion',$6,now())", [submission, a.patient, version, { q: true }, snapshot, 'b'.repeat(64)]);
  await db.query('INSERT INTO mezaj_results(id,patient_id,assessment_version_id,assessment_submission_id,result_band_snapshot,assessed_at) VALUES($1,$2,$3,$4,$5,now())', [randomUUID(), a.patient, version, submission, snapshot.resultBand]);
  await db.query("INSERT INTO billing_intents(id,patient_id,clinic_id,purpose,amount_rial,actor_user_id,idempotency_key,fingerprint,updated_at) VALUES($1,$2,$3,'TOPUP',1000,$4,'legacy-topup',$5,now())", [randomUUID(), a.patient, clinic, a.user, 'c'.repeat(64)]);
  await db.query("INSERT INTO commerce_orders(id,clinic_id,patient_id,idempotency_key,shipping_method,subtotal_amount_toman,total_amount_toman,updated_at) VALUES($1,$2,$3,'legacy-order','PICKUP',123,123,now())", [randomUUID(), clinic, a.patient]);
  await db.query('INSERT INTO wallet_accounts(id,owner_key,clinic_id,patient_id,updated_at) VALUES($1,$2,$3,$4,now())', [randomUUID(), `patient:${a.patient}`, clinic, a.patient]);
  await db.query("INSERT INTO assessment_offering_versions(id,clinic_id,offering_key,version_number,kind,title,locale,assessment_version_id,price_mode,amount_rial,currency,created_by_user_id,idempotency_key,payload_hash) VALUES($1,$2,'LEGACY_DRAFT',1,'INDIVIDUAL','Synthetic','x-couple-up',$3,'FREE',0,'IRR',$4,'legacy-offering',$5)", [randomUUID(), clinic, version, a.user, 'd'.repeat(64)]);
  const policy = randomUUID(), text = 'Synthetic test-only account linking policy. No medical data processing.';
  const contentHash = createHash('sha256').update(text).digest('hex');
  await db.query("INSERT INTO consent_policy_versions(id,clinic_id,policy_key,version_number,locale,title,body,content_hash,status,activated_at,updated_at) VALUES($1,$2,'COUPLES_ACCOUNT_LINKING',1,'fa-IR','Synthetic',$3,$4,'ACTIVE',now(),now())", [policy, clinic, text, contentHash]);
  const tables = ['users', 'sessions', 'patient_profiles', 'patient_medical_intakes', 'patient_medical_intake_revisions', 'assessment_versions', 'patient_assessment_submissions', 'mezaj_results', 'billing_intents', 'commerce_orders', 'wallet_accounts', 'assessment_offering_versions', 'consent_policy_versions'];
  const before = new Map();
  // Fixed source-controlled identifiers; no runtime or user-provided table names.
  for (const table of tables) before.set(table, (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows);
  await db.query(await readFile(new URL(`${latest}/migration.sql`, root), 'utf8'));
  for (const table of tables) assert.deepEqual((await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows, before.get(table), `Legacy ${table} changed`);
  for (const table of ['couple_sessions', 'couple_participants', 'couple_invitations']) assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
  const link = randomUUID(), initiator = randomUUID(), partner = randomUUID(), invitation = randomUUID();
  await db.query('BEGIN');
  await db.query("INSERT INTO couple_sessions(id,clinic_id,initiator_patient_id,consent_policy_version_id,consent_content_hash,idempotency_key,payload_hash,updated_at) VALUES($1,$2,$3,$4,$5,'couple-start',$6,now())", [link, clinic, a.patient, policy, contentHash, 'e'.repeat(64)]);
  await db.query("INSERT INTO couple_participants(id,session_id,clinic_id,patient_id,slot,consent_policy_version_id,consent_content_hash,accepted_by_user_id,accepted_session_id) VALUES($1,$2,$3,$4,'INITIATOR',$5,$6,$7,$8)", [initiator, link, clinic, a.patient, policy, contentHash, a.user, a.session]);
  await db.query('COMMIT');
  const secretHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  await db.query("INSERT INTO couple_invitations(id,session_id,clinic_id,issuer_patient_id,recipient_patient_id,token_hash,idempotency_key,payload_hash,created_at) VALUES($1,$2,$3,$4,$5,$6,'old-invitation',$7,'2020-01-01')", [invitation, link, clinic, a.patient, b.patient, secretHash, 'f'.repeat(64)]);
  await db.query('BEGIN');
  await db.query("INSERT INTO couple_participants(id,session_id,clinic_id,patient_id,slot,consent_policy_version_id,consent_content_hash,accepted_by_user_id,accepted_session_id) VALUES($1,$2,$3,$4,'PARTNER',$5,$6,$7,$8)", [partner, link, clinic, b.patient, policy, contentHash, b.user, b.session]);
  await db.query("UPDATE couple_invitations SET status='ACCEPTED',accepted_at=now() WHERE id=$1", [invitation]);
  await db.query("UPDATE couple_sessions SET state='LINKED',updated_at=now() WHERE id=$1", [link]); await db.query('COMMIT');
  await assert.rejects(db.query("UPDATE couple_participants SET consent_content_hash=$2 WHERE id=$1", [partner, 'a'.repeat(64)]), /immutable/);
  await assert.rejects(db.query('DELETE FROM couple_participants WHERE id=$1', [partner]), /retained/);
  await db.query('BEGIN'); await db.query('UPDATE couple_participants SET revoked_at=GREATEST(now(),accepted_at) WHERE id=$1', [partner]); await db.query("UPDATE couple_sessions SET state='CONSENT_REVOKED',updated_at=now() WHERE id=$1", [link]); await db.query('COMMIT');
  await assert.rejects(db.query('UPDATE couple_participants SET revoked_at=NULL WHERE id=$1', [partner]), /revocation is final/);
  for (const table of tables) assert.deepEqual((await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows, before.get(table), `Couple operations mutated legacy ${table}`);
  console.log(`PASS: ${migrations.length} migrations; populated legacy health/identity/consent/offering/financial rows preserved; old invitation accepted without deadline; independent consent and final revocation constraints verified.`);
} finally { await db.end(); }
