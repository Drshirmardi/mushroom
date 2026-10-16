import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_upgrade') {
  throw new Error('Upgrade proof requires empty disposable localhost:55419/patient_journey_upgrade.');
}
const db = new Client({ connectionString: target.toString() });
await db.connect();
const root = new URL('../prisma/migrations/', import.meta.url);
const latest = '20261016170000_assessment_submission_reliability';
try {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0, 'Database must be empty.');
  // This historical proof intentionally covers the original R01 boundary, even after later additive migrations.
  const migrations = (await readdir(root)).filter(name => /^\d+_/.test(name) && name <= latest).sort();
  assert.equal(migrations.at(-1), latest, 'Review this proof when another migration is added.');
  for (const name of migrations.filter(name => name !== latest)) await db.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));

  const clinic = (await db.query("SELECT id FROM clinics WHERE status='ACTIVE' LIMIT 1")).rows[0].id;
  const user = randomUUID(), patient = randomUUID(), version = randomUUID();
  const active = randomUUID(), complete = randomUUID(), duplicate = randomUUID(), mezaj = randomUUID();
  const answer = { q: true };
  const snapshot = { snapshotVersion: 1, answers: answer, score: 2, resultBand: { id: 'only', title: 'Synthetic' } };
  const hash = createHash('sha256').update(JSON.stringify(answer)).digest('hex');
  await db.query("INSERT INTO users(id,phone,updated_at) VALUES($1,'+989112345678',now())", [user]);
  await db.query('INSERT INTO patient_profiles(id,user_id,clinic_id,updated_at) VALUES($1,$2,$3,now())', [patient, user, clinic]);
  await db.query("INSERT INTO assessment_versions(id,clinic_id,assessment_key,version_number,locale,title,structure,content_hash,status,published_at,updated_at) VALUES($1,$2,'MEZAJ',1,'x-upgrade','Synthetic',$3,$4,'PUBLISHED',now(),now())", [version, clinic, { schemaVersion: 1, sections: [] }, 'a'.repeat(64)]);
  await db.query('INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,answers,updated_at) VALUES($1,$2,$3,1,$4,now())', [active, patient, version, answer]);
  await db.query("INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,state,answers,score,result_snapshot,completed_at,completion_idempotency_key,completion_payload_hash,updated_at) VALUES($1,$2,$3,2,'COMPLETE',$4,2,$5,now(),'legacy-completion',$6,now())", [complete, patient, version, answer, snapshot, hash]);
  await db.query('INSERT INTO mezaj_results(id,patient_id,assessment_version_id,assessment_submission_id,result_band_snapshot,assessed_at) VALUES($1,$2,$3,$4,$5,now())', [mezaj, patient, version, complete, snapshot.resultBand]);
  const before = (await db.query('SELECT * FROM patient_assessment_submissions ORDER BY id')).rows;
  const resultBefore = (await db.query('SELECT * FROM mezaj_results')).rows;

  await db.query('INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,updated_at) VALUES($1,$2,$3,3,now())', [duplicate, patient, version]);
  const sql = await readFile(new URL(`${latest}/migration.sql`, root), 'utf8');
  await assert.rejects(db.query(sql), /duplicate active attempts require reviewed resolution/);
  await db.query('ROLLBACK');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='patient_assessment_submissions' AND column_name='revision'")).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM patient_assessment_submissions')).rows[0].n, 3, 'Refusal cannot remove existing patient attempts.');
  // Remove only the deliberately-created, uncompleted duplicate fixture after proving refusal preserved it.
  await db.query('DELETE FROM patient_assessment_submissions WHERE id=$1', [duplicate]);
  await db.query(sql);
  const after = (await db.query('SELECT * FROM patient_assessment_submissions ORDER BY id')).rows;
  assert.deepEqual(after.map(({ revision, ...row }) => row), before);
  assert.ok(after.every(row => row.revision === 0));
  assert.deepEqual((await db.query('SELECT * FROM mezaj_results')).rows, resultBefore);

  // An old application omits revision but still advances it on answer/complete writes.
  await db.query('UPDATE patient_assessment_submissions SET answers=$2 WHERE id=$1', [active, { q: false }]);
  assert.equal((await db.query('SELECT revision FROM patient_assessment_submissions WHERE id=$1', [active])).rows[0].revision, 1);
  await assert.rejects(db.query('UPDATE patient_assessment_submissions SET revision=99 WHERE id=$1', [active]), /revision cannot change/);
  await assert.rejects(db.query('UPDATE patient_assessment_submissions SET revision=1 WHERE id=$1', [complete]), /revision cannot change/);
  await assert.rejects(db.query('UPDATE patient_assessment_submissions SET answers=$2 WHERE id=$1', [complete, { q: false }]), /completed assessment submissions are immutable/);
  await assert.rejects(db.query('INSERT INTO patient_assessment_submissions(id,patient_id,assessment_version_id,attempt_number,updated_at) VALUES($1,$2,$3,4,now())', [randomUUID(), patient, version]), /one_active_idx/);
  const replacement = { snapshotVersion: 1, answers: { q: false }, score: 0, resultBand: null };
  await db.query("UPDATE patient_assessment_submissions SET state='COMPLETE',completed_at=now(),result_snapshot=$2,completion_idempotency_key='old-writer-complete',completion_payload_hash=$3 WHERE id=$1", [active, replacement, 'b'.repeat(64)]);
  assert.equal((await db.query('SELECT revision FROM patient_assessment_submissions WHERE id=$1', [active])).rows[0].revision, 2);
  console.log(`PASS: ${migrations.length} migrations; duplicate refusal is atomic; historical answers/results preserved; old-writer revision and immutability constraints verified.`);
} finally { await db.end(); }
