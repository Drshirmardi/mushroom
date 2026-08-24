import 'dotenv/config';

import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the development seed.');
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
  await client.query(`
    INSERT INTO clinics (id, name, time_zone, status, updated_at)
    SELECT gen_random_uuid(), 'کلینیک سبز زندگی', 'Asia/Tehran', 'ACTIVE', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE status = 'ACTIVE')
  `);
  console.log('Development seed completed: identity roles and the active clinic are available.');
} finally {
  await client.end();
}
