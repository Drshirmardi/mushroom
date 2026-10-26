import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
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
const input = { phone: `+989${randomInt(100_000_000, 1_000_000_000)}`, password: 'isolated installer fixture passphrase', clinicName: 'Installer fixture', timeZone: 'Asia/Tehran' };
try {
  await client.connect();
  await second.connect();
  if (process.argv.includes('--without-existing-clinic')) {
    await client.query("UPDATE clinics SET status='INACTIVE' WHERE status='ACTIVE'");
  }
  assert.equal((await client.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 0);
  const clinicCount = (await client.query('SELECT count(*)::int AS count FROM clinics')).rows[0].count;
  // Existing users must never be upgraded to ADMIN by first-run bootstrap.
  const patient = await client.query("INSERT INTO users (id, phone, updated_at) VALUES (gen_random_uuid(), '+989100000099', now()) RETURNING id");
  await assert.rejects(bootstrapInstallation(client, input), /without existing users/u);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM clinics')).rows[0].count, clinicCount);
  await client.query('DELETE FROM users WHERE id = $1::uuid', [patient.rows[0].id]);

  // An audit failure must roll back the new identity, clinic changes and membership together.
  await client.query(`CREATE FUNCTION installation_fixture_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.action = 'installation.first_administrator_created' THEN
        IF NOT EXISTS (SELECT 1 FROM clinical_clinic_accesses a
          JOIN clinics c ON c.id=a.clinic_id
          WHERE a.user_id=NEW.actor_user_id AND c.status='ACTIVE'
            AND NEW.metadata->>'clinicId'=c.id::text) THEN
          RAISE EXCEPTION 'Missing initial clinic membership';
        END IF;
        RAISE EXCEPTION 'Synthetic bootstrap audit rejection';
      END IF;
      RETURN NEW;
    END $$`);
  await client.query('CREATE TRIGGER installation_fixture_reject_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION installation_fixture_reject_audit()');
  try {
    await assert.rejects(bootstrapInstallation(client, input), /Synthetic bootstrap audit rejection/u);
    for (const table of ['users', 'credentials', 'user_roles', 'clinical_clinic_accesses', 'audit_events']) {
      assert.equal((await client.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 0);
    }
    assert.equal((await client.query('SELECT count(*)::int AS count FROM clinics')).rows[0].count, clinicCount);
  } finally {
    await client.query('DROP TRIGGER installation_fixture_reject_audit ON audit_events');
    await client.query('DROP FUNCTION installation_fixture_reject_audit()');
  }

  const results = await Promise.all([bootstrapInstallation(client, input), bootstrapInstallation(second, input)]);
  assert.deepEqual(results.sort(), ['already-initialized', 'initialized']);
  const membership = (await client.query(`SELECT a.user_id, a.clinic_id, u.phone, c.name, c.status
    FROM clinical_clinic_accesses a JOIN users u ON u.id=a.user_id JOIN clinics c ON c.id=a.clinic_id`)).rows;
  assert.equal(membership.length, 1);
  assert.equal(membership[0].phone, input.phone);
  assert.equal(membership[0].name, input.clinicName);
  assert.equal(membership[0].status, 'ACTIVE');
  const event = (await client.query("SELECT actor_user_id, subject_id, metadata FROM audit_events WHERE action='installation.first_administrator_created'")).rows[0];
  assert.equal(event.actor_user_id, membership[0].user_id);
  assert.equal(event.subject_id, membership[0].user_id);
  assert.equal(event.metadata.clinicId, membership[0].clinic_id);
  const before = (await client.query('SELECT password_hash FROM credentials')).rows[0].password_hash;
  assert(before.startsWith('$argon2id$v=19$'));
  assert.deepEqual(new Set(before.split('$')[3].split(',')), new Set(['m=65536', 't=3', 'p=4']));
  assert(await verify(before, input.password));
  assert.equal(await bootstrapInstallation(client, { ...input, password: 'a different valid fixture passphrase' }), 'already-initialized');
  assert.equal((await client.query('SELECT password_hash FROM credentials')).rows[0].password_hash, before);
  const otherPhone = input.phone.slice(0, -1) + ((Number(input.phone.at(-1)) + 1) % 10);
  await assert.rejects(bootstrapInstallation(client, { ...input, phone: otherPhone }), /already exists/u);
  await assert.rejects(bootstrapInstallation(client, { ...input, password: 'passwordpassword' }));
  assert.equal((await client.query('SELECT count(*)::int AS count FROM users')).rows[0].count, 1);
  assert.equal((await client.query("SELECT count(*)::int AS count FROM audit_events WHERE action='installation.first_administrator_created'")).rows[0].count, 1);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM consent_policy_versions')).rows[0].count, 0);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM clinical_clinic_accesses')).rows[0].count, 1);
  // A later revocation must not be silently undone by rerunning first-run bootstrap.
  await client.query('DELETE FROM clinical_clinic_accesses WHERE user_id=$1::uuid AND clinic_id=$2::uuid', [membership[0].user_id, membership[0].clinic_id]);
  assert.equal(await bootstrapInstallation(client, input), 'already-initialized');
  assert.equal((await client.query('SELECT count(*)::int AS count FROM clinical_clinic_accesses')).rows[0].count, 0);
  assert.equal((await client.query('SELECT password_hash FROM credentials')).rows[0].password_hash, before);
  console.log(`First-run PostgreSQL bootstrap (${process.argv.includes('--without-existing-clinic') ? 'new clinic' : 'default clinic'}): input-selected admin membership, concurrent retry, rollback, preserved credentials/revocation and audit PASS.`);
} finally {
  await second.end();
  await client.end();
}
