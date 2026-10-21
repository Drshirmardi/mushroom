import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost','127.0.0.1'].includes(target.hostname) || target.port !== '55419' || !['/patient_journey_custom_delivery_upgrade','/patient_journey_custom_delivery_upgrade_final','/patient_journey_custom_delivery_upgrade_release'].includes(target.pathname)) throw new Error('Explicit disposable populated65 native custom upgrade clone:55419 required.');
const db = new Client({ connectionString: target.toString() }); await db.connect();
try {
  assert.equal((await db.query("SELECT to_regclass('custom_program_plan_versions') AS relation")).rows[0].relation,null);
  // Give retained synthetic qualified reviewers their deliberately missing fixture capability in this clone only.
  await db.query("INSERT INTO clinical_role_permissions(role_id,permission) SELECT id,'CLINICAL_RECORD_SIGN' FROM roles WHERE code='DOCTOR' ON CONFLICT DO NOTHING");
  for(const name of ['program_purchases','program_access_grants','custom_program_requests','custom_program_care_authorizations','assessment_access_grants','couple_assessment_joint_results']) assert.ok((await db.query(`SELECT count(*)::int AS n FROM ${name}`)).rows[0].n>0,`Populated ${name} proof required`);
  const names=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(r=>r.table_name);
  async function rows(name){assert.match(name,/^[a-z0-9_]+$/i);const projection=name==='program_purchases'?"to_jsonb(t)-ARRAY['custom_request_id','care_authorization_id']":'to_jsonb(t)';return(await db.query(`SELECT ${projection} AS row FROM "${name}" t ORDER BY (${projection})::text`)).rows;}
  const before=new Map();for(const name of names)before.set(name,await rows(name));
  const programProof=async()=>(await db.query('SELECT id,program_grant_readable(id,patient_id) AS allowed FROM program_access_grants ORDER BY id')).rows;
  const careProof=async()=>(await db.query('SELECT id,custom_program_care_current(id) AS allowed FROM custom_program_care_authorizations ORDER BY id')).rows;
  const oldPrograms=await programProof(),oldCare=await careProof();assert.ok(oldPrograms.some(r=>r.allowed),'Actual retained readable educational grant required');
  for(const file of ['20261018004000_custom_program_native_delivery','20261018005000_custom_program_professional_readiness','20261018006000_custom_program_deferred_request_scope','20261018007000_custom_program_activity_boundaries','20261018008000_custom_program_assigned_worklist','20261018009000_custom_native_content_lookups','20261018010000_custom_program_medical_lock_order','20261018011000_custom_program_current_medical_policy']) await db.query(await readFile(new URL(`../prisma/migrations/${file}/migration.sql`,import.meta.url),'utf8'));
  for(const name of names)assert.deepEqual(await rows(name),before.get(name),`Custom delivery changed existing ${name}`);
  assert.deepEqual(await programProof(),oldPrograms);assert.deepEqual(await careProof(),oldCare);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM program_purchases WHERE custom_request_id IS NOT NULL OR care_authorization_id IS NOT NULL')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM custom_program_plan_versions')).rows[0].n,0);
  console.log(`PASS: populated65-to73 preserves every row across ${names.length} tables, actual old readable program rights and scoped care; old purchase custom FKs NULL and native version ledger empty.`);
} finally { await db.end(); }
