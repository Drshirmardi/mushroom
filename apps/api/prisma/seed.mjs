import 'dotenv/config';

import { createHash } from 'node:crypto';
import { argon2id, hash } from 'argon2';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
const developmentAdminPhone = process.env.DEV_DASHBOARD_ADMIN_PHONE;
const developmentAdminPassword = process.env.DEV_DASHBOARD_ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the development seed.');
}

if (Boolean(developmentAdminPhone) !== Boolean(developmentAdminPassword)) {
  throw new Error(
    'DEV_DASHBOARD_ADMIN_PHONE and DEV_DASHBOARD_ADMIN_PASSWORD must be set together.',
  );
}

if (
  developmentAdminPhone
  && developmentAdminPassword
  && process.env.NODE_ENV !== 'development'
) {
  throw new Error('Development dashboard credentials may only be seeded in development.');
}

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(`
    INSERT INTO roles (id, code, description, updated_at)
    VALUES
      (gen_random_uuid(), 'PATIENT', 'Patient application access', CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'DOCTOR', 'Doctor clinical access', CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'STAFF', 'Clinic staff access', CURRENT_TIMESTAMP),
      (gen_random_uuid(), 'ADMIN', 'Administrative access', CURRENT_TIMESTAMP)
    ON CONFLICT (code) DO UPDATE
      SET description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
  `);
  const policyBody = 'با ثبت اطلاعات پزشکی خوداظهاری، رضایت می‌دهم این داده‌ها برای تکمیل پرونده اولیهٔ کلینیک پردازش شوند.';
  const policyContentHash = createHash('sha256').update(policyBody, 'utf8').digest('hex');
  await client.query(`
    INSERT INTO consent_policy_versions (
      id, clinic_id, policy_key, version_number, locale, title, body,
      content_hash, status, activated_at, updated_at
    )
    SELECT gen_random_uuid(), id, 'MEDICAL_INTAKE_PROCESSING', 1, 'fa-IR',
      'رضایت پردازش اطلاعات پزشکی اولیه', $1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM clinics
    WHERE status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM consent_policy_versions
        WHERE clinic_id = clinics.id
          AND policy_key = 'MEDICAL_INTAKE_PROCESSING'
          AND locale = 'fa-IR'
          AND status = 'ACTIVE'
      )
  `, [policyBody, policyContentHash]);
  await client.query(`
    INSERT INTO clinics (id, name, time_zone, status, updated_at)
    SELECT gen_random_uuid(), 'کلینیک سبز زندگی', 'Asia/Tehran', 'ACTIVE', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE status = 'ACTIVE')
  `);
  if (developmentAdminPhone && developmentAdminPassword) {
    const passwordHash = await hash(developmentAdminPassword, {
      type: argon2id,
      version: 0x13,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32,
    });
    const admin = await client.query(`
      INSERT INTO users (id, phone, status, updated_at)
      VALUES (gen_random_uuid(), $1, 'ACTIVE', CURRENT_TIMESTAMP)
      ON CONFLICT (phone) DO UPDATE
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [developmentAdminPhone]);
    const adminUserId = admin.rows[0]?.id;

    await client.query(`
      INSERT INTO credentials (id, user_id, password_hash, password_changed_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            password_changed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
    `, [adminUserId, passwordHash]);
    await client.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_at)
      SELECT $1, id, CURRENT_TIMESTAMP FROM roles WHERE code = 'ADMIN'
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [adminUserId]);
  }
  console.log('Development seed completed: identity roles and the active clinic are available.');
} finally {
  await client.end();
}
