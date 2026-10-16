import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

// Explicit one-shot check: requires an EMPTY task-owned database, never an existing application DB.
const url = new URL(process.env.DATABASE_URL ?? '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55417');
assert.equal(url.pathname, '/wallet_upgrade');
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  assert.equal((await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  const root = resolve('prisma/migrations');
  const migrations = (await readdir(root, { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name).sort();
  const boundary = '20261016120000_shared_wallet_billing';
  const apply = async name => client.query(await readFile(resolve(root, name, 'migration.sql'), 'utf8'));
  for (const name of migrations.filter(name => name < boundary)) await apply(name);
  const [clinic, user, patient, config, revision, order, attempt, payment, refund] = Array.from({ length: 9 }, randomUUID);
  await client.query("INSERT INTO clinics(id,name,status,updated_at) VALUES($1,$2,'INACTIVE',now())", [clinic, 'Synthetic wallet upgrade']);
  await client.query('INSERT INTO users(id,phone,updated_at) VALUES($1,$2,now())', [user, '+989123456789']);
  await client.query('INSERT INTO patient_profiles(id,user_id,clinic_id,updated_at) VALUES($1,$2,$3,now())', [patient, user, clinic]);
  await client.query('INSERT INTO payment_provider_configs(id,clinic_id,provider_code,updated_at) VALUES($1,$2,$3,now())', [config, clinic, 'synthetic-upgrade']);
  await client.query('INSERT INTO payment_provider_config_revisions(id,config_id,revision_number) VALUES($1,$2,1)', [revision, config]);
  await client.query("INSERT INTO commerce_orders(id,clinic_id,patient_id,idempotency_key,shipping_method,subtotal_amount_toman,total_amount_toman,updated_at) VALUES($1,$2,$3,'legacy-order','PICKUP',100,100,now())", [order, clinic, patient]);
  await client.query("INSERT INTO payment_attempts(id,clinic_id,patient_id,order_id,provider_config_revision_id,provider_order_id,commerce_amount_toman,provider_amount,provider_unit,status,idempotency_key,updated_at) VALUES($1,$2,$3,$4,$5,12345,100,1000,'RIAL','VERIFIED','legacy-attempt',now())", [attempt, clinic, patient, order, revision]);
  await client.query("INSERT INTO payments(id,order_id,payment_attempt_id,commerce_amount_toman,provider_amount,provider_unit,provider_reference_id,verified_at) VALUES($1,$2,$3,100,1000,'RIAL','legacy-proof',now())", [payment, order, attempt]);
  await client.query("INSERT INTO refunds(id,payment_id,amount_toman,status,idempotency_key,evidence_reference,completed_at,updated_at) VALUES($1,$2,10,'COMPLETED','legacy-refund','legacy-evidence',now(),now())", [refund, payment]);
  const before = (await client.query('SELECT * FROM payments WHERE id=$1', [payment])).rows[0];
  const beforeAttempt = (await client.query('SELECT * FROM payment_attempts WHERE id=$1', [attempt])).rows[0];
  for (const name of migrations.filter(name => name >= boundary)) await apply(name);
  const after = (await client.query('SELECT * FROM payments WHERE id=$1', [payment])).rows[0];
  for (const [key, value] of Object.entries(before)) assert.deepEqual(after[key], value, key);
  assert.deepEqual((await client.query('SELECT * FROM payment_attempts WHERE id=$1', [attempt])).rows[0], beforeAttempt);
  assert.equal(after.method, 'GATEWAY');
  assert.equal(after.wallet_journal_id, null);
  assert.equal((await client.query('SELECT evidence_reference FROM refunds WHERE id=$1', [refund])).rows[0].evidence_reference, 'legacy-evidence');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM wallet_accounts')).rows[0].n, 0);
  console.log(`PASS: ${migrations.length} migrations; legacy payment, attempt and refund preserved; no invented balances.`);
} finally { await client.end(); }
