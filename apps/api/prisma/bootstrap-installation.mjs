import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { hashPassword } from '../dist/modules/identity/infrastructure/password-hasher.js';

export async function bootstrapInstallation(client, input) {
  if (!input || !/^\+989\d{9}$/u.test(input.phone ?? '')
      || typeof input.clinicName !== 'string' || !input.clinicName.trim() || input.clinicName.length > 160
      || input.timeZone !== 'Asia/Tehran' || typeof input.password !== 'string') {
    throw new Error('Invalid first-administrator input.');
  }
  // Reuse the application password policy/Argon2id parameters, including on retries.
  const passwordHash = await hashPassword(input.password);
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(19301901, 1)');
    const admins = await client.query(`SELECT u.id, u.phone, u.status FROM users u
      JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'ADMIN'`);
    if (admins.rows.length) {
      if (admins.rows.length !== 1 || admins.rows[0].phone !== input.phone || admins.rows[0].status !== 'ACTIVE') {
        throw new Error('An administrator already exists; first-run bootstrap cannot grant or reset access.');
      }
      await client.query('COMMIT');
      return 'already-initialized';
    }
    const users = await client.query('SELECT 1 FROM users LIMIT 1');
    if (users.rowCount) throw new Error('First-run bootstrap requires an installation without existing users.');
    const clinics = await client.query('SELECT id, name FROM clinics WHERE status = \'ACTIVE\' FOR UPDATE');
    if (clinics.rowCount > 1 || (clinics.rowCount === 1 && ![input.clinicName, 'کلینیک سبز زندگی'].includes(clinics.rows[0].name))) {
      throw new Error('Existing clinic does not match first-run input.');
    }
    let clinicId = clinics.rows[0]?.id;
    if (!clinics.rowCount) {
      const clinic = await client.query(`INSERT INTO clinics (id, name, time_zone, status, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', CURRENT_TIMESTAMP) RETURNING id`, [input.clinicName, input.timeZone]);
      clinicId = clinic.rows[0].id;
    } else {
      // The migration already supplies one default clinic; name it only before any user exists.
      await client.query('UPDATE clinics SET name=$1, time_zone=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3::uuid',
        [input.clinicName, input.timeZone, clinics.rows[0].id]);
    }
    const role = await client.query("SELECT id FROM roles WHERE code = 'ADMIN'");
    if (role.rowCount !== 1) throw new Error('Required ADMIN reference data is missing; run migrations first.');
    const user = await client.query(`INSERT INTO users (id, phone, status, updated_at)
      VALUES (gen_random_uuid(), $1, 'ACTIVE', CURRENT_TIMESTAMP) RETURNING id`, [input.phone]);
    const id = user.rows[0].id;
    await client.query(`INSERT INTO credentials (id, user_id, password_hash, updated_at)
      VALUES (gen_random_uuid(), $1::uuid, $2, CURRENT_TIMESTAMP)`, [id, passwordHash]);
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1::uuid, $2::uuid)', [id, role.rows[0].id]);
    await client.query('INSERT INTO clinical_clinic_accesses (user_id, clinic_id) VALUES ($1::uuid, $2::uuid)', [id, clinicId]);
    await client.query(`INSERT INTO audit_events (id, action, actor_user_id, subject_type, subject_id, metadata)
      VALUES (gen_random_uuid(), 'installation.first_administrator_created', $1::uuid, 'User', $1::uuid,
      jsonb_build_object('source', 'server-installer', 'version', 1, 'clinicId', $2::uuid))`, [id, clinicId]);
    await client.query('COMMIT');
    return 'initialized';
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    if (!['development', 'staging', 'production-sim', 'production'].includes(process.env.MUSHROOM_ENVIRONMENT)) {
      throw new Error('Explicit installation environment required.');
    }
    const input = JSON.parse(await readFile('/run/mushroom-installation/first-run.json', 'utf8'));
    await client.connect();
    const result = await bootstrapInstallation(client, input);
    process.stdout.write(`First-run bootstrap: ${result}\n`);
  } catch {
    process.stderr.write('First-run bootstrap rejected or failed. Existing credentials were preserved; review installation input and database state.\n');
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
