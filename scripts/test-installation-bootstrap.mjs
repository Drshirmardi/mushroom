import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bootstrapInstallation } from '../apps/api/prisma/bootstrap-installation.mjs';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = require('pg');
const { verify } = require('argon2');

const connectionString = process.env.INSTALLATION_TEST_DATABASE_URL;
assert(connectionString && /^\/[a-z0-9_]*installation_test$/u.test(new URL(connectionString).pathname),
  'Use a newly migrated, disposable *_installation_test database only.');
const client = new Client({ connectionString });
const second = new Client({ connectionString });
const input = { phone: '+989100000001', password: 'isolated installer fixture passphrase', clinicName: 'Installer fixture', timeZone: 'Asia/Tehran' };
try {
  await client.connect();
  await second.connect();
  assert.equal((await client.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0);
  const clinicCount = (await client.query('SELECT count(*)::int AS count FROM clinics')).rows[0].count;
  // Existing users must never be upgraded to ADMIN by first-run bootstrap.
  const patient = await client.query("INSERT INTO users (id, phone, updated_at) VALUES (gen_random_uuid(), '+989100000099', now()) RETURNING id");
  await assert.rejects(bootstrapInstallation(client, input), /without existing users/u);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM clinics')).rows[0].count, clinicCount);
  await client.query('DELETE FROM users WHERE id = $1::uuid', [patient.rows[0].id]);
  const results = await Promise.all([bootstrapInstallation(client, input), bootstrapInstallation(second, input)]);
  assert.deepEqual(results.sort(), ['already-initialized', 'initialized']);
  const before = (await client.query('SELECT password_hash FROM credentials')).rows[0].password_hash;
  assert(before.startsWith('$argon2id$v=19$'));
  assert.deepEqual(new Set(before.split('$')[3].split(',')), new Set(['m=65536', 't=3', 'p=4']));
  assert(await verify(before, input.password));
  assert.equal(await bootstrapInstallation(client, { ...input, password: 'a different valid fixture passphrase' }), 'already-initialized');
  assert.equal((await client.query('SELECT password_hash FROM credentials')).rows[0].password_hash, before);
  await assert.rejects(bootstrapInstallation(client, { ...input, phone: '+989100000002' }), /already exists/u);
  await assert.rejects(bootstrapInstallation(client, { ...input, password: 'passwordpassword' }));
  assert.equal((await client.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 1);
  assert.equal((await client.query("SELECT count(*)::int AS count FROM audit_events WHERE action='installation.first_administrator_created'")).rows[0].count, 1);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM consent_policy_versions')).rows[0].count, 0);
  console.log('First-run PostgreSQL bootstrap: fresh initialization, concurrent retry, preserved credentials, existing-user denial and audit PASS.');
} finally {
  await second.end();
  await client.end();
}
