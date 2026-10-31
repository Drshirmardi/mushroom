import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { Client } from 'pg';

const target = new URL(process.env.DATABASE_URL ?? '');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55429');
assert.equal(target.pathname, '/mz05_proof');
const db = new Client({ connectionString: target.toString() });
await db.connect();
try {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  const root = new URL('../prisma/migrations/', import.meta.url);
  const names = (await readdir(root)).filter(name => /^\d+_/.test(name) && name <= '20261030120000_assessment_scoped_policies').sort();
  const latest = '20261030120000_assessment_scoped_policies';
  assert.equal(names.at(-1), latest);
  for (const name of names.filter(name => name !== latest)) await db.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
  const clinic = (await db.query("SELECT id FROM clinics WHERE status='ACTIVE'")).rows[0].id;
  const policy = randomUUID(), user = randomUUID(), source = randomUUID();
  const body = 'Synthetic legacy policy';
  const hash = createHash('sha256').update(body).digest('hex');
  await db.query("INSERT INTO consent_policy_versions(id,clinic_id,policy_key,version_number,locale,title,body,content_hash,status,activated_at,updated_at) VALUES($1,$2,'ASSESSMENT_PROCESSING',1,'fa-IR','Synthetic',$3,$4,'ACTIVE',now(),now())", [policy, clinic, body, hash]);
  const before = (await db.query('SELECT * FROM consent_policy_versions WHERE id=$1', [policy])).rows[0];
  await db.query(await readFile(new URL(`${latest}/migration.sql`, root), 'utf8'));
  const after = (await db.query('SELECT * FROM consent_policy_versions WHERE id=$1', [policy])).rows[0];
  assert.equal(after.assessment_offering_version_id, null);
  delete after.assessment_offering_version_id;
  assert.deepEqual(after, before);
  await db.query("INSERT INTO users(id,phone,updated_at) VALUES($1,'+989112345670',now())", [user]);
  await db.query("INSERT INTO assessment_versions(id,clinic_id,assessment_key,version_number,locale,title,structure,content_hash,status,published_at,updated_at) VALUES($1,$2,'SCOPED',1,'fa-IR','Synthetic',$3,$4,'PUBLISHED',now(),now())", [source, clinic, { schemaVersion: 1, sections: [] }, hash]);
  const offer = async () => {
    const id = randomUUID();
    await db.query("INSERT INTO assessment_offering_versions(id,clinic_id,offering_key,version_number,kind,title,locale,assessment_version_id,price_mode,amount_rial,currency,created_by_user_id,idempotency_key,payload_hash) VALUES($1,$2,$3,1,'INDIVIDUAL','Synthetic','fa-IR',$4,'FREE',0,'IRR',$5,$6,$7)", [id, clinic, `TEST_${id.replaceAll('-', '').toUpperCase()}`, source, user, randomUUID(), hash]);
    return id;
  };
  const first = await offer(), second = await offer();
  const scoped = async (id, offering, version, locale = 'fa-IR', key = 'ASSESSMENT_PROCESSING') => db.query("INSERT INTO consent_policy_versions(id,clinic_id,policy_key,version_number,locale,title,body,content_hash,status,activated_at,updated_at,assessment_offering_version_id) VALUES($1,$2,$3,$4,$5,'Synthetic',$6,$7,'ACTIVE',now(),now(),$8)", [id, clinic, key, version, locale, body, hash, offering]);
  const scopedId = randomUUID();
  await scoped(scopedId, first, 2);
  await scoped(randomUUID(), second, 3);
  await assert.rejects(scoped(randomUUID(), first, 4), /duplicate key/);
  await assert.rejects(scoped(randomUUID(), first, 4, 'en-US'), /clinic and locale/);
  await assert.rejects(scoped(randomUUID(), first, 4, 'fa-IR', 'MEDICAL_INTAKE_PROCESSING'), /purpose_check/);
  await assert.rejects(db.query('UPDATE consent_policy_versions SET assessment_offering_version_id=$1 WHERE id=$2', [second, scopedId]), /immutable/);
  await assert.rejects(scoped(randomUUID(), null, 4), /duplicate key/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM consent_policy_versions WHERE status='ACTIVE' AND policy_key='ASSESSMENT_PROCESSING'")).rows[0].n, 3);
  console.log(`PASS ${names.length} migrations; populated preservation, independent scopes, uniqueness, locale/purpose and immutability guards`);
} finally { await db.end(); }
