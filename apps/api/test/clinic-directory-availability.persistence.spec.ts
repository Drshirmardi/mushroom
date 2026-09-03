import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_directory_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client;
let client: Client;

const createDatabaseUrl = (name: string): string => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for directory persistence tests.');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
};

const createDirectoryFixture = async (): Promise<{
  clinicId: string;
  otherClinicId: string;
  doctorId: string;
  otherDoctorId: string;
  specialtyId: string;
  serviceId: string;
  otherServiceId: string;
}> => {
  const activeClinic = await client.query<{ id: string }>(`
    SELECT id FROM clinics WHERE status = 'ACTIVE'
  `);
  const clinicId = activeClinic.rows[0]?.id;
  if (!clinicId) throw new Error('Expected the migrated active clinic.');

  const suffix = randomUUID().slice(0, 8);
  const otherClinic = await client.query<{ id: string }>(`
    INSERT INTO clinics (id, name, time_zone, status, updated_at)
    VALUES (gen_random_uuid(), $1, 'Asia/Tehran', 'INACTIVE', CURRENT_TIMESTAMP)
    RETURNING id
  `, [`کلینیک دوم ${suffix}`]);
  const otherClinicId = otherClinic.rows[0]?.id;
  if (!otherClinicId) throw new Error('Expected a second clinic.');

  const specialty = await client.query<{ id: string }>(`
    INSERT INTO specialties (
      id, clinic_id, name, canonical_name, is_active,
      publication_status, published_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, true,
      'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING id
  `, [clinicId, `پزشکی عمومی ${suffix}`, `پزشکی عمومی ${suffix}`]);
  const specialtyId = specialty.rows[0]?.id;
  if (!specialtyId) throw new Error('Expected a specialty.');

  const doctor = await client.query<{ id: string }>(`
    INSERT INTO doctor_profiles (id, clinic_id, display_name, is_active, updated_at)
    VALUES (gen_random_uuid(), $1, $2, true, CURRENT_TIMESTAMP)
    RETURNING id
  `, [clinicId, `دکتر آزمون ${suffix}`]);
  const doctorId = doctor.rows[0]?.id;
  if (!doctorId) throw new Error('Expected a doctor.');

  await client.query(`
    INSERT INTO doctor_specialties (clinic_id, doctor_id, specialty_id)
    VALUES ($1, $2, $3)
  `, [clinicId, doctorId, specialtyId]);
  await client.query(`
    UPDATE doctor_profiles
    SET publication_status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [doctorId]);

  const service = await client.query<{ id: string }>(`
    INSERT INTO services (
      id, clinic_id, name, canonical_name, is_active,
      publication_status, published_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, true,
      'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING id
  `, [clinicId, `ویزیت ${suffix}`, `ویزیت ${suffix}`]);
  const serviceId = service.rows[0]?.id;
  if (!serviceId) throw new Error('Expected a service.');

  const otherDoctor = await client.query<{ id: string }>(`
    INSERT INTO doctor_profiles (id, clinic_id, display_name, updated_at)
    VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
    RETURNING id
  `, [otherClinicId, `دکتر دوم ${suffix}`]);
  const otherDoctorId = otherDoctor.rows[0]?.id;
  if (!otherDoctorId) throw new Error('Expected a second doctor.');

  const otherService = await client.query<{ id: string }>(`
    INSERT INTO services (id, clinic_id, name, canonical_name, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)
    RETURNING id
  `, [otherClinicId, `خدمت دوم ${suffix}`, `خدمت دوم ${suffix}`]);
  const otherServiceId = otherService.rows[0]?.id;
  if (!otherServiceId) throw new Error('Expected a second service.');

  return {
    clinicId,
    otherClinicId,
    doctorId,
    otherDoctorId,
    specialtyId,
    serviceId,
    otherServiceId,
  };
};

describe('Phase 04 directory and availability persistence', () => {
  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for directory persistence tests.');
    }

    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const result = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: createDatabaseUrl(databaseName) },
        encoding: 'utf8',
      },
    );
    expect(result.status, result.stderr).toBe(0);

    client = new Client({ connectionString: createDatabaseUrl(databaseName) });
    await client.connect();
  }, 60_000);

  afterAll(async () => {
    if (client) await client.end();
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminClient.end();
    }
  });

  it('enforces directory lifecycle, value bounds, and same-clinic ownership', async () => {
    const fixture = await createDirectoryFixture();

    const defaults = await client.query<{
      languages: string[];
      education: string[];
      certifications: string[];
      is_active: boolean;
      publication_status: string;
      published_at: Date | null;
    }>(`
      SELECT languages, education, certifications, is_active,
        publication_status::text, published_at
      FROM doctor_profiles
      WHERE id = $1
    `, [fixture.otherDoctorId]);
    expect(defaults.rows).toEqual([{
      languages: [],
      education: [],
      certifications: [],
      is_active: false,
      publication_status: 'UNPUBLISHED',
      published_at: null,
    }]);

    await expect(client.query(`
      UPDATE doctor_profiles
      SET publication_status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [fixture.otherDoctorId])).rejects.toMatchObject({
      code: '23514',
      constraint: 'doctor_profiles_publication_dependencies_check',
    });

    await expect(client.query(`
      INSERT INTO specialties (
        id, clinic_id, name, canonical_name, updated_at
      ) VALUES (gen_random_uuid(), $1, 'نام دیگر', $2, CURRENT_TIMESTAMP)
    `, [fixture.clinicId, (await client.query<{ canonical_name: string }>(`
      SELECT canonical_name FROM specialties WHERE id = $1
    `, [fixture.specialtyId])).rows[0]?.canonical_name])).rejects.toMatchObject({
      code: '23505',
      constraint: 'specialties_clinic_canonical_name_key',
    });

    await expect(client.query(`
      INSERT INTO doctor_profiles (
        id, clinic_id, display_name, languages, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'دکتر نامعتبر', ARRAY['fa', 'fa'], CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId])).rejects.toMatchObject({
      code: '23514',
      constraint: 'doctor_profiles_languages_check',
    });

    await client.query(`
      INSERT INTO doctor_services (
        id, clinic_id, doctor_id, service_id, visit_mode,
        duration_minutes, buffer_minutes, price_amount, is_active,
        publication_status, published_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'IN_PERSON',
        45, 15, 500000, true, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId, fixture.serviceId]);

    await expect(client.query(`
      INSERT INTO doctor_services (
        id, clinic_id, doctor_id, service_id, visit_mode,
        duration_minutes, buffer_minutes, price_amount, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'ONLINE',
        400, 120, 1, CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId, fixture.serviceId])).rejects.toMatchObject({
      code: '23514',
      constraint: 'doctor_services_terms_check',
    });

    await expect(client.query(`
      INSERT INTO doctor_services (
        id, clinic_id, doctor_id, service_id, visit_mode,
        duration_minutes, buffer_minutes, price_amount, currency, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'ONLINE',
        30, 0, 1, 'USD', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId, fixture.serviceId])).rejects.toMatchObject({
      code: '23514',
      constraint: 'doctor_services_terms_check',
    });

    await expect(client.query(`
      INSERT INTO doctor_services (
        id, clinic_id, doctor_id, service_id, visit_mode,
        duration_minutes, price_amount, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'ONLINE', 30, 1, CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId, fixture.otherServiceId])).rejects.toMatchObject({
      code: '23503',
      constraint: 'doctor_services_service_id_clinic_id_fkey',
    });
  }, 30_000);

  it('uses half-open database exclusions for rules, closures, and effective exception modes', async () => {
    const fixture = await createDirectoryFixture();

    await client.query(`
      INSERT INTO availability_rules (
        id, clinic_id, doctor_id, visit_mode, iso_weekday,
        start_local_time, end_local_time, updated_at
      ) VALUES
        (gen_random_uuid(), $1, $2, 'IN_PERSON', 1, '09:00', '10:00', CURRENT_TIMESTAMP),
        (gen_random_uuid(), $1, $2, 'IN_PERSON', 1, '10:00', '11:00', CURRENT_TIMESTAMP)
    `, [fixture.clinicId, fixture.doctorId]);

    await expect(client.query(`
      INSERT INTO availability_rules (
        id, clinic_id, doctor_id, visit_mode, iso_weekday,
        start_local_time, end_local_time, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'IN_PERSON', 1,
        '09:30', '10:30', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId])).rejects.toMatchObject({
      code: '23P01',
      constraint: 'availability_rules_no_active_overlap',
    });

    await client.query(`
      INSERT INTO availability_rules (
        id, clinic_id, doctor_id, visit_mode, iso_weekday,
        start_local_time, end_local_time, is_active, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'IN_PERSON', 1,
        '09:30', '10:30', false, CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId]);

    await client.query(`
      INSERT INTO clinic_closures (
        id, clinic_id, starts_at, ends_at, label, updated_at
      ) VALUES
        (gen_random_uuid(), $1, '2026-09-10T05:30:00Z', '2026-09-10T06:30:00Z', 'تعطیلی یک', CURRENT_TIMESTAMP),
        (gen_random_uuid(), $1, '2026-09-10T06:30:00Z', '2026-09-10T07:30:00Z', 'تعطیلی دو', CURRENT_TIMESTAMP)
    `, [fixture.clinicId]);

    await expect(client.query(`
      INSERT INTO clinic_closures (
        id, clinic_id, starts_at, ends_at, label, updated_at
      ) VALUES (
        gen_random_uuid(), $1, '2026-09-10T06:00:00Z',
        '2026-09-10T07:00:00Z', 'تعطیلی هم‌پوشان', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId])).rejects.toMatchObject({
      code: '23P01',
      constraint: 'clinic_closures_no_active_overlap',
    });

    await client.query(`
      INSERT INTO doctor_availability_exceptions (
        id, clinic_id, doctor_id, kind, visit_mode,
        starts_at, ends_at, label, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'UNAVAILABLE', NULL,
        '2026-09-11T05:30:00Z', '2026-09-11T06:30:00Z', 'مرخصی', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId]);

    await expect(client.query(`
      INSERT INTO doctor_availability_exceptions (
        id, clinic_id, doctor_id, kind, visit_mode,
        starts_at, ends_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'UNAVAILABLE', 'IN_PERSON',
        '2026-09-11T06:00:00Z', '2026-09-11T07:00:00Z', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId])).rejects.toMatchObject({
      code: '23P01',
      constraint: 'doctor_availability_exceptions_no_active_overlap',
    });

    await client.query(`
      INSERT INTO doctor_availability_exceptions (
        id, clinic_id, doctor_id, kind, visit_mode,
        starts_at, ends_at, updated_at
      ) VALUES
        (gen_random_uuid(), $1, $2, 'AVAILABLE', 'IN_PERSON',
          '2026-09-11T06:00:00Z', '2026-09-11T07:00:00Z', CURRENT_TIMESTAMP),
        (gen_random_uuid(), $1, $2, 'AVAILABLE', 'ONLINE',
          '2026-09-11T06:00:00Z', '2026-09-11T07:00:00Z', CURRENT_TIMESTAMP)
    `, [fixture.clinicId, fixture.doctorId]);

    await expect(client.query(`
      INSERT INTO doctor_availability_exceptions (
        id, clinic_id, doctor_id, kind, visit_mode,
        starts_at, ends_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'AVAILABLE', NULL,
        '2026-09-12T05:30:00Z', '2026-09-12T06:30:00Z', CURRENT_TIMESTAMP
      )
    `, [fixture.clinicId, fixture.doctorId])).rejects.toMatchObject({
      code: '23514',
      constraint: 'doctor_availability_exceptions_mode_check',
    });
  }, 30_000);
});
