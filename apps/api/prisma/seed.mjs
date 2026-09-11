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
  await client.query(`
    INSERT INTO clinics (id, name, time_zone, status, updated_at)
    SELECT gen_random_uuid(), 'کلینیک سبز زندگی', 'Asia/Tehran', 'ACTIVE', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE status = 'ACTIVE')
  `);
  const seededClinic = await client.query(`
    SELECT id FROM clinics WHERE status = 'ACTIVE' ORDER BY created_at ASC, id ASC LIMIT 1
  `);
  const clinicId = seededClinic.rows[0]?.id;
  if (!clinicId) throw new Error('An active clinic is required for the development seed.');

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
    WHERE id = $3::uuid
      AND NOT EXISTS (
        SELECT 1 FROM consent_policy_versions
        WHERE clinic_id = clinics.id
          AND policy_key = 'MEDICAL_INTAKE_PROCESSING'
          AND locale = 'fa-IR'
          AND status = 'ACTIVE'
      )
  `, [policyBody, policyContentHash, clinicId]);
  await client.query(`
    INSERT INTO specialties (id, clinic_id, name, canonical_name, description, is_active, publication_status, published_at, updated_at)
    VALUES
      ('40000000-0000-4000-8000-000000000001', $1::uuid, 'طب سنتی ایرانی', 'traditional-iranian-medicine', 'ویزیت و مشاورهٔ طب سنتی', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000002', $1::uuid, 'تغذیه', 'nutrition', 'مشاورهٔ تغذیه و سبک زندگی', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, name = EXCLUDED.name, canonical_name = EXCLUDED.canonical_name,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active,
      publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
      updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO services (id, clinic_id, name, canonical_name, description, is_active, publication_status, published_at, updated_at)
    VALUES
      ('40000000-0000-4000-8000-000000000011', $1::uuid, 'ویزیت طب سنتی', 'traditional-medicine-visit', 'ویزیت حضوری طب سنتی', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000012', $1::uuid, 'مشاورهٔ تغذیه', 'nutrition-consultation', 'مشاورهٔ آنلاین تغذیه', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, name = EXCLUDED.name, canonical_name = EXCLUDED.canonical_name,
      description = EXCLUDED.description, is_active = EXCLUDED.is_active,
      publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
      updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO doctor_profiles (id, clinic_id, display_name, biography, years_experience, languages, education, certifications, is_active, publication_status, published_at, updated_at)
    VALUES
      ('40000000-0000-4000-8000-000000000021', $1::uuid, 'دکتر مهران فرهمند', 'پزشک طب سنتی با تمرکز بر مراقبت‌های سبک زندگی.', 12, ARRAY['فارسی', 'انگلیسی'], ARRAY['دکترای طب سنتی'], ARRAY['گواهی طب سنتی ایران'], FALSE, 'UNPUBLISHED', NULL, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000022', $1::uuid, 'دکتر نازنین بهرامی', 'مشاور تغذیه برای برنامه‌های پایدار روزمره.', 8, ARRAY['فارسی'], ARRAY['دکترای تغذیه'], ARRAY['گواهی تغذیهٔ بالینی'], FALSE, 'UNPUBLISHED', NULL, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, display_name = EXCLUDED.display_name, biography = EXCLUDED.biography,
      years_experience = EXCLUDED.years_experience, languages = EXCLUDED.languages, education = EXCLUDED.education,
      certifications = EXCLUDED.certifications, is_active = EXCLUDED.is_active,
      publication_status = EXCLUDED.publication_status, published_at = EXCLUDED.published_at,
      updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO doctor_specialties (clinic_id, doctor_id, specialty_id)
    VALUES
      ($1::uuid, '40000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000001'),
      ($1::uuid, '40000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000002')
    ON CONFLICT (doctor_id, specialty_id) DO NOTHING
  `, [clinicId]);
  await client.query(`
    UPDATE doctor_profiles
    SET is_active = TRUE, publication_status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id IN ('40000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000022')
      AND clinic_id = $1::uuid
  `, [clinicId]);
  await client.query(`
    INSERT INTO doctor_services (id, clinic_id, doctor_id, service_id, visit_mode, duration_minutes, buffer_minutes, price_amount, currency, is_active, publication_status, published_at, updated_at)
    VALUES
      ('40000000-0000-4000-8000-000000000031', $1::uuid, '40000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000011', 'IN_PERSON', 30, 10, 850000, 'IRR', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000032', $1::uuid, '40000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000012', 'ONLINE', 45, 0, 650000, 'IRR', TRUE, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, doctor_id = EXCLUDED.doctor_id, service_id = EXCLUDED.service_id,
      visit_mode = EXCLUDED.visit_mode, duration_minutes = EXCLUDED.duration_minutes,
      buffer_minutes = EXCLUDED.buffer_minutes, price_amount = EXCLUDED.price_amount, currency = EXCLUDED.currency,
      is_active = EXCLUDED.is_active, publication_status = EXCLUDED.publication_status,
      published_at = EXCLUDED.published_at, updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO availability_rules (id, clinic_id, doctor_id, visit_mode, iso_weekday, start_local_time, end_local_time, is_active, updated_at)
    VALUES
      ('40000000-0000-4000-8000-000000000041', $1::uuid, '40000000-0000-4000-8000-000000000021', 'IN_PERSON', 1, TIME '09:00:00', TIME '12:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000042', $1::uuid, '40000000-0000-4000-8000-000000000021', 'IN_PERSON', 2, TIME '09:00:00', TIME '12:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000043', $1::uuid, '40000000-0000-4000-8000-000000000021', 'IN_PERSON', 3, TIME '09:00:00', TIME '12:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000044', $1::uuid, '40000000-0000-4000-8000-000000000021', 'IN_PERSON', 4, TIME '09:00:00', TIME '12:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000045', $1::uuid, '40000000-0000-4000-8000-000000000021', 'IN_PERSON', 5, TIME '09:00:00', TIME '12:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000046', $1::uuid, '40000000-0000-4000-8000-000000000022', 'ONLINE', 1, TIME '10:00:00', TIME '13:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000047', $1::uuid, '40000000-0000-4000-8000-000000000022', 'ONLINE', 2, TIME '10:00:00', TIME '13:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000048', $1::uuid, '40000000-0000-4000-8000-000000000022', 'ONLINE', 3, TIME '10:00:00', TIME '13:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000049', $1::uuid, '40000000-0000-4000-8000-000000000022', 'ONLINE', 4, TIME '10:00:00', TIME '13:00:00', TRUE, CURRENT_TIMESTAMP),
      ('40000000-0000-4000-8000-000000000050', $1::uuid, '40000000-0000-4000-8000-000000000022', 'ONLINE', 5, TIME '10:00:00', TIME '13:00:00', TRUE, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, doctor_id = EXCLUDED.doctor_id, visit_mode = EXCLUDED.visit_mode,
      iso_weekday = EXCLUDED.iso_weekday, start_local_time = EXCLUDED.start_local_time,
      end_local_time = EXCLUDED.end_local_time, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO commerce_categories (id, clinic_id, name, slug, is_active, updated_at)
    VALUES ('40000000-0000-4000-8000-000000000101', $1::uuid, 'محصولات نمونه', 'sample-products', TRUE, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, name = EXCLUDED.name, slug = EXCLUDED.slug,
      is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO commerce_products (id, clinic_id, category_id, title, slug, description, status, updated_at)
    VALUES ('40000000-0000-4000-8000-000000000102', $1::uuid, '40000000-0000-4000-8000-000000000101', 'محصول نمونهٔ فروشگاه', 'sample-store-product', 'دادهٔ غیرحساس توسعه برای آزمون catalog.', 'ACTIVE', CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, category_id = EXCLUDED.category_id, title = EXCLUDED.title,
      slug = EXCLUDED.slug, description = EXCLUDED.description, status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO commerce_skus (id, clinic_id, product_id, code, title, current_price_toman, current_tax_toman, is_active, updated_at)
    VALUES ('40000000-0000-4000-8000-000000000103', $1::uuid, '40000000-0000-4000-8000-000000000102', 'SAMPLE-COMMERCE-001', 'واحد نمونه', 125000, 0, TRUE, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, product_id = EXCLUDED.product_id, code = EXCLUDED.code,
      title = EXCLUDED.title, current_price_toman = EXCLUDED.current_price_toman,
      current_tax_toman = EXCLUDED.current_tax_toman, is_active = EXCLUDED.is_active,
      updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO inventory_items (id, clinic_id, sku_id, on_hand_quantity, reserved_quantity, updated_at)
    VALUES ('40000000-0000-4000-8000-000000000104', $1::uuid, '40000000-0000-4000-8000-000000000103', 25, 0, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      clinic_id = EXCLUDED.clinic_id, sku_id = EXCLUDED.sku_id, on_hand_quantity = EXCLUDED.on_hand_quantity,
      reserved_quantity = EXCLUDED.reserved_quantity, updated_at = CURRENT_TIMESTAMP
  `, [clinicId]);
  await client.query(`
    INSERT INTO commerce_shipping_rates (id, clinic_id, method, amount_toman, is_active, updated_at)
    SELECT gen_random_uuid(), $1::uuid, 'COURIER', 25000, TRUE, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
      SELECT 1 FROM commerce_shipping_rates
      WHERE clinic_id = $1::uuid AND method = 'COURIER'
    )
  `, [clinicId]);
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
    await client.query('DELETE FROM login_attempts WHERE phone = $1', [developmentAdminPhone]);
  }
  console.log('Development seed completed: identity roles, clinic directory/schedule records, and non-sensitive Phase 09 catalog data are available.');
} finally {
  await client.end();
}
