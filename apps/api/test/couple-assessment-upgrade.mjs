import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '55419' || target.pathname !== '/patient_journey_participation_upgrade') throw new Error('Disposable populated52 clone localhost:55419/patient_journey_participation_upgrade required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
try {
  assert.equal((await db.query("SELECT to_regclass('public.couple_assessment_sessions') AS relation")).rows[0].relation, null);
  assert.ok((await db.query('SELECT count(*)::int AS n FROM assessment_access_grants')).rows[0].n > 0, 'Clone the accepted populated P02/C02 upgrade proof first.');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM couple_result_protocol_versions')).rows[0].n, 0);
  const source = (await db.query("SELECT v.*,r.id AS review_id FROM assessment_versions v JOIN assessment_protocol_reviews r ON r.assessment_version_id=v.id WHERE v.status='PUBLISHED' AND r.decision='APPROVED' AND r.review_number=(SELECT max(review_number) FROM assessment_protocol_reviews WHERE assessment_version_id=v.id) LIMIT 1")).rows[0]; assert.ok(source);
  const admin = (await db.query("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='ADMIN' LIMIT 1")).rows[0].id;
  const doctor = (await db.query("SELECT d.id,d.user_id FROM doctor_profiles d WHERE guidance_doctor_id(d.user_id,$1)=d.id LIMIT 1", [source.clinic_id])).rows[0]; assert.ok(doctor);
  const content = (await db.query("SELECT * FROM guidance_content_versions WHERE clinic_id=$1 AND locale=$2 AND status='APPROVED' LIMIT 1", [source.clinic_id, source.locale])).rows[0]; assert.ok(content);
  const adminSession = randomUUID(), doctorSession = randomUUID();
  await db.query("INSERT INTO sessions(id,user_id,refresh_token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour'),($4,$5,$6,now()+interval '1 hour')", [adminSession, admin, digest(adminSession), doctorSession, doctor.user_id, digest(doctorSession)]);
  const disclosure = randomUUID(), body = 'Synthetic upgrade fixture only. Not approved legal disclosure.', disclosureHash = createHash('sha256').update(body).digest('hex');
  await db.query("INSERT INTO consent_policy_versions(id,clinic_id,policy_key,version_number,locale,title,body,content_hash,status,activated_at,updated_at) VALUES($1,$2,'COUPLES_RESULT_SHARING',1,$3,'Synthetic',$4,$5,'ACTIVE',now(),now())", [disclosure, source.clinic_id, source.locale, body, disclosureHash]);
  const pairs = source.structure.resultBands.flatMap((a, i) => source.structure.resultBands.slice(i).map(b => ({ firstBandId: a.id, secondBandId: b.id, guidanceContentIds: [content.id], recommendConsultation: true })));
  const definition = { assessmentVersionId: source.id, protocolReviewId: source.review_id, disclosurePolicyVersionId: disclosure, pairs, questionnaireContentHash: source.content_hash, disclosureContentHash: disclosureHash, algorithmId: 'APPROVED_PAIR_LOOKUP', algorithmVersion: 1, contentReferences: [{ id: content.id, contentHash: content.content_hash }] };
  const joint = randomUUID();
  await db.query("INSERT INTO couple_result_protocol_versions(id,clinic_id,assessment_version_id,protocol_review_id,disclosure_policy_version_id,disclosure_content_hash,questionnaire_content_hash,version_number,pairs,content_references,content_hash,created_by_user_id,created_session_id,idempotency_key,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8,$9,$10,$11,$12,'participation-upgrade-protocol',$13)", [joint, source.clinic_id, source.id, source.review_id, disclosure, disclosureHash, source.content_hash, JSON.stringify(pairs), JSON.stringify(definition.contentReferences), digest(definition), admin, adminSession, digest('synthetic-upgrade-command')]);
  await db.query("UPDATE couple_result_protocol_versions SET status='APPROVED',approved_by_user_id=$2,approved_doctor_id=$3,approved_session_id=$4,approved_at=GREATEST(now(),created_at) WHERE id=$1", [joint, doctor.user_id, doctor.id, doctorSession]);
  assert.equal((await db.query('SELECT couple_result_protocol_usable($1) AS usable', [joint])).rows[0].usable, true);
  const names = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(row => row.table_name);
  async function rows(name) { assert.match(name, /^[a-z0-9_]+$/i); return (await db.query(`SELECT to_jsonb(t) AS row FROM "${name}" t ORDER BY to_jsonb(t)::text`)).rows; }
  const before = new Map(); for (const name of names) before.set(name, await rows(name));
  await db.query('BEGIN');
  try {
    await db.query(await readFile(new URL('../prisma/migrations/20261017003000_couple_assessment_participation/migration.sql', import.meta.url), 'utf8'));
    for (const name of names) assert.deepEqual(await rows(name), before.get(name), `Participation migration changed existing ${name}`);
    for (const table of ['couple_assessment_sessions', 'couple_assessment_participants']) assert.equal((await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
    assert.equal((await db.query('SELECT couple_assessment_mutual_consent($1::uuid) AS ready', [randomUUID()])).rows[0].ready, false);
    assert.equal((await db.query('SELECT couple_result_protocol_usable($1) AS usable', [joint])).rows[0].usable, true); await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  console.log(`PASS: populated52-to53 preserves every row across ${names.length} existing tables including physician-approved joint definition and all earlier private/financial/couple data; new participation ledgers empty and unconsented.`);
} finally { await db.end(); }
