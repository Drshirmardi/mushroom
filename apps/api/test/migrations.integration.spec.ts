import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_smoke_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client;

const createDatabaseUrl = (name = databaseName): string => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the migration smoke test.');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;

  return url.toString();
};

describe('Prisma migrations (empty PostgreSQL smoke test)', () => {
  beforeAll(async () => {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for the migration smoke test.');
    }

    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  });

  afterAll(async () => {
    if (!adminClient) return;

    await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminClient.end();
  });

  it('applies every migration to a newly created database', async () => {
    const prismaCli = resolve(
      process.cwd(),
      'node_modules/prisma/build/index.js',
    );
    const result = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: createDatabaseUrl() },
        encoding: 'utf8',
      },
    );

    expect(result.status, result.stderr).toBe(0);

    const preSeedClient = new Client({ connectionString: createDatabaseUrl() });
    await preSeedClient.connect();
    try {
      const migratedRoles = await preSeedClient.query<{ code: string }>(`
        SELECT code::text
        FROM roles
        ORDER BY code
      `);

      expect(migratedRoles.rows.map(({ code }) => code)).toEqual([
        'ADMIN',
        'DOCTOR',
        'PATIENT',
        'STAFF',
      ]);

      const prescriptionIssuers = await preSeedClient.query<{ code: string }>(`
        SELECT roles.code::text
        FROM clinical_role_permissions
        INNER JOIN roles ON roles.id = clinical_role_permissions.role_id
        WHERE clinical_role_permissions.permission = 'PRESCRIPTION_ISSUE'
        ORDER BY roles.code
      `);

      expect(prescriptionIssuers.rows.map(({ code }) => code)).toEqual([
        'DOCTOR',
      ]);

      const clinics = await preSeedClient.query<{
        name: string;
        time_zone: string;
        status: string;
      }>(`
        SELECT name, time_zone, status::text
        FROM clinics
        WHERE status = 'ACTIVE'
      `);
      expect(clinics.rows).toEqual([{
        name: 'کلینیک سبز زندگی',
        time_zone: 'Asia/Tehran',
        status: 'ACTIVE',
      }]);
    } finally {
      await preSeedClient.end();
    }

    for (let run = 0; run < 2; run += 1) {
      const seedResult = spawnSync(
        process.execPath,
        ['prisma/seed.mjs'],
        {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: createDatabaseUrl() },
          encoding: 'utf8',
        },
      );

      expect(seedResult.status, seedResult.stderr).toBe(0);
    }

    const smokeClient = new Client({ connectionString: createDatabaseUrl() });
    await smokeClient.connect();

    try {
      const tables = await smokeClient.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name
      `, [[
        'audit_events',
        'credentials',
        'login_attempts',
        'roles',
        'sessions',
        'user_roles',
        'users',
        'clinics',
        'user_profiles',
        'patient_profiles',
        'patient_medical_intakes',
        'patient_medical_intake_revisions',
        'consent_policy_versions',
        'patient_consent_records',
        'assessment_versions',
        'patient_assessment_submissions',
        'booking_eligibility_policies',
        'doctor_profiles',
        'specialties',
        'doctor_specialties',
        'services',
        'doctor_services',
        'availability_rules',
        'clinic_closures',
        'doctor_availability_exceptions',
        'appointments',
        'appointment_holds',
        'appointment_status_history',
        'queue_entries',
        'operational_activities',
        'encounters',
        'clinical_notes',
        'clinical_note_revisions',
        'prescriptions',
        'prescription_revisions',
        'prescription_items',
        'prescription_safety_acknowledgements',
        'treatment_plans',
        'treatment_medications',
        'exercise_plans',
        'nutrition_plans',
        'treatment_session_plans',
        'treatment_tasks',
        'medication_adherence_logs',
        'treatment_progress_events',
        'diagnoses',
        'allergy_records',
        'condition_records',
        'medication_statements',
        'patient_access_audits',
      ]]);

      expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
        'allergy_records',
        'appointment_holds',
        'appointment_status_history',
        'appointments',
        'assessment_versions',
        'audit_events',
        'availability_rules',
        'booking_eligibility_policies',
        'clinic_closures',
        'clinical_note_revisions',
        'clinical_notes',
        'clinics',
        'condition_records',
        'consent_policy_versions',
        'credentials',
        'diagnoses',
        'doctor_availability_exceptions',
        'doctor_profiles',
        'doctor_services',
        'doctor_specialties',
        'encounters',
        'exercise_plans',
        'login_attempts',
        'medication_adherence_logs',
        'medication_statements',
        'nutrition_plans',
        'operational_activities',
        'patient_access_audits',
        'patient_assessment_submissions',
        'patient_consent_records',
        'patient_medical_intake_revisions',
        'patient_medical_intakes',
        'patient_profiles',
        'prescription_items',
        'prescription_revisions',
        'prescription_safety_acknowledgements',
        'prescriptions',
        'queue_entries',
        'roles',
        'services',
        'sessions',
        'specialties',
        'treatment_medications',
        'treatment_plans',
        'treatment_progress_events',
        'treatment_session_plans',
        'treatment_tasks',
        'user_profiles',
        'user_roles',
        'users',
      ]);

      const roles = await smokeClient.query<{ code: string }>(`
        SELECT code::text
        FROM roles
        ORDER BY code
      `);

      expect(roles.rows.map(({ code }) => code)).toEqual([
        'ADMIN',
        'DOCTOR',
        'PATIENT',
        'STAFF',
      ]);

      const loginAttemptOutcomes = await smokeClient.query<{ value: string }>(`
        SELECT enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'login_attempt_outcome'
        ORDER BY enumsortorder
      `);

      expect(loginAttemptOutcomes.rows.map(({ value }) => value)).toEqual([
        'PENDING',
        'SUCCESS',
        'INVALID_CREDENTIALS',
        'RATE_LIMITED',
        'ACCOUNT_DISABLED',
      ]);

      const timestampColumns = await smokeClient.query<{ data_type: string }>(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'credentials', 'sessions', 'roles', 'user_roles', 'login_attempts', 'audit_events')
          AND column_name IN ('created_at', 'updated_at', 'last_used_at', 'expires_at', 'revoked_at', 'assigned_at', 'password_changed_at')
      `);

      expect(timestampColumns.rows.length).toBeGreaterThan(0);
      expect(timestampColumns.rows.every(({ data_type }) => data_type === 'timestamp with time zone')).toBe(true);

      const phaseTwoTimestamps = await smokeClient.query<{ data_type: string }>(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('clinics', 'user_profiles', 'patient_profiles', 'patient_medical_intakes', 'patient_medical_intake_revisions', 'consent_policy_versions', 'patient_consent_records')
          AND column_name IN ('created_at', 'updated_at', 'accepted_at', 'withdrawn_at', 'completed_at', 'activated_at', 'retired_at')
      `);
      expect(phaseTwoTimestamps.rows.length).toBeGreaterThan(0);
      expect(phaseTwoTimestamps.rows.every(({ data_type }) => data_type === 'timestamp with time zone')).toBe(true);

      const activeClinics = await smokeClient.query<{ count: string }>(`
        SELECT count(*)::text AS count FROM clinics WHERE status = 'ACTIVE'
      `);
      expect(activeClinics.rows[0]?.count).toBe('1');

      const partialIndexes = await smokeClient.query<{ indexname: string; indexdef: string }>(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
      `, [[
        'clinics_one_active_idx',
        'consent_policy_versions_one_active_idx',
        'patient_consent_records_one_active_grant_idx',
      ]]);
      expect(partialIndexes.rows).toHaveLength(3);
      expect(partialIndexes.rows.every(({ indexdef }) => indexdef.includes('WHERE'))).toBe(true);

      const intakeEnums = await smokeClient.query<{ typname: string }>(`
        SELECT typname
        FROM pg_type
        WHERE typname = ANY($1::text[])
        ORDER BY typname
      `, [[
        'sex_at_birth', 'blood_type', 'sleep_duration_band',
        'exercise_frequency', 'stress_level', 'tobacco_use', 'consent_source',
      ]]);
      expect(intakeEnums.rows.map(({ typname }) => typname)).toEqual([
        'blood_type', 'consent_source', 'exercise_frequency',
        'sex_at_birth', 'sleep_duration_band', 'stress_level', 'tobacco_use',
      ]);

      const enumValues = await smokeClient.query<{
        typname: string;
        value: string;
      }>(`
        SELECT pg_type.typname, pg_enum.enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ANY($1::text[])
        ORDER BY pg_type.typname, pg_enum.enumsortorder
      `, [['sleep_duration_band', 'exercise_frequency', 'tobacco_use']]);
      expect(enumValues.rows).toEqual([
        { typname: 'exercise_frequency', value: 'NONE' },
        { typname: 'exercise_frequency', value: 'ONCE_OR_TWICE_WEEKLY' },
        { typname: 'exercise_frequency', value: 'THREE_OR_FOUR_TIMES_WEEKLY' },
        { typname: 'exercise_frequency', value: 'DAILY' },
        { typname: 'exercise_frequency', value: 'UNKNOWN' },
        { typname: 'sleep_duration_band', value: 'LESS_THAN_5_HOURS' },
        { typname: 'sleep_duration_band', value: 'FROM_5_TO_LESS_THAN_7_HOURS' },
        { typname: 'sleep_duration_band', value: 'FROM_7_TO_9_HOURS' },
        { typname: 'sleep_duration_band', value: 'MORE_THAN_9_HOURS' },
        { typname: 'sleep_duration_band', value: 'UNKNOWN' },
        { typname: 'tobacco_use', value: 'NEVER' },
        { typname: 'tobacco_use', value: 'FORMER' },
        { typname: 'tobacco_use', value: 'CURRENT' },
        { typname: 'tobacco_use', value: 'UNKNOWN' },
      ]);

      const assessmentEnums = await smokeClient.query<{ typname: string }>(`
        SELECT typname
        FROM pg_type
        WHERE typname = ANY($1::text[])
        ORDER BY typname
      `, [[
        'assessment_version_status',
        'patient_assessment_state',
        'booking_assessment_requirement',
      ]]);
      expect(assessmentEnums.rows.map(({ typname }) => typname)).toEqual([
        'assessment_version_status',
        'booking_assessment_requirement',
        'patient_assessment_state',
      ]);

      const phaseFourEnums = await smokeClient.query<{
        typname: string;
        value: string;
      }>(`
        SELECT pg_type.typname, pg_enum.enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ANY($1::text[])
        ORDER BY pg_type.typname, pg_enum.enumsortorder
      `, [[
        'directory_publication_status',
        'doctor_availability_exception_kind',
        'visit_mode',
      ]]);
      expect(phaseFourEnums.rows).toEqual([
        { typname: 'directory_publication_status', value: 'UNPUBLISHED' },
        { typname: 'directory_publication_status', value: 'PUBLISHED' },
        { typname: 'doctor_availability_exception_kind', value: 'AVAILABLE' },
        { typname: 'doctor_availability_exception_kind', value: 'UNAVAILABLE' },
        { typname: 'visit_mode', value: 'IN_PERSON' },
        { typname: 'visit_mode', value: 'ONLINE' },
      ]);

      const phaseFiveEnums = await smokeClient.query<{
        typname: string;
        value: string;
      }>(`
        SELECT pg_type.typname, pg_enum.enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ANY($1::text[])
        ORDER BY pg_type.typname, pg_enum.enumsortorder
      `, [[
        'appointment_status',
        'appointment_status_history_action',
      ]]);
      expect(phaseFiveEnums.rows).toEqual([
        { typname: 'appointment_status', value: 'PENDING' },
        { typname: 'appointment_status', value: 'CONFIRMED' },
        { typname: 'appointment_status', value: 'CHECKED_IN' },
        { typname: 'appointment_status', value: 'QUEUED' },
        { typname: 'appointment_status', value: 'IN_PROGRESS' },
        { typname: 'appointment_status', value: 'COMPLETED' },
        { typname: 'appointment_status', value: 'NO_SHOW' },
        { typname: 'appointment_status', value: 'CANCELLED' },
        { typname: 'appointment_status_history_action', value: 'CREATED' },
        { typname: 'appointment_status_history_action', value: 'CONFIRMED' },
        { typname: 'appointment_status_history_action', value: 'CANCELLED' },
        { typname: 'appointment_status_history_action', value: 'RESCHEDULED' },
        { typname: 'appointment_status_history_action', value: 'CHECKED_IN' },
        { typname: 'appointment_status_history_action', value: 'QUEUED' },
        { typname: 'appointment_status_history_action', value: 'STARTED' },
        { typname: 'appointment_status_history_action', value: 'COMPLETED' },
        { typname: 'appointment_status_history_action', value: 'NO_SHOW' },
      ]);

      const phaseSixEnums = await smokeClient.query<{
        typname: string;
        value: string;
      }>(`
        SELECT pg_type.typname, pg_enum.enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ANY($1::text[])
        ORDER BY pg_type.typname, pg_enum.enumsortorder
      `, [[
        'encounter_state', 'clinical_record_state',
        'clinical_note_revision_state', 'patient_access_action',
      ]]);
      expect(phaseSixEnums.rows).toEqual([
        { typname: 'clinical_note_revision_state', value: 'DRAFT' },
        { typname: 'clinical_note_revision_state', value: 'SIGNED' },
        { typname: 'clinical_note_revision_state', value: 'VOIDED' },
        { typname: 'clinical_record_state', value: 'DRAFT' },
        { typname: 'clinical_record_state', value: 'ACTIVE' },
        { typname: 'clinical_record_state', value: 'INACTIVE' },
        { typname: 'clinical_record_state', value: 'SUPERSEDED' },
        { typname: 'clinical_record_state', value: 'VOIDED' },
        { typname: 'encounter_state', value: 'IN_PROGRESS' },
        { typname: 'encounter_state', value: 'COMPLETED' },
        { typname: 'encounter_state', value: 'VOIDED' },
        { typname: 'patient_access_action', value: 'READ' },
        { typname: 'patient_access_action', value: 'CREATE' },
        { typname: 'patient_access_action', value: 'UPDATE' },
        { typname: 'patient_access_action', value: 'SIGN' },
        { typname: 'patient_access_action', value: 'AMEND' },
        { typname: 'patient_access_action', value: 'PUBLISH' },
        { typname: 'patient_access_action', value: 'EXPORT' },
      ]);

      const phaseSevenEnums = await smokeClient.query<{
        typname: string;
        value: string;
      }>(`
        SELECT pg_type.typname, pg_enum.enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = ANY($1::text[])
        ORDER BY pg_type.typname, pg_enum.enumsortorder
      `, [[
        'prescription_revision_state',
        'treatment_plan_state',
        'treatment_task_state',
      ]]);
      expect(phaseSevenEnums.rows).toEqual([
        { typname: 'prescription_revision_state', value: 'DRAFT' },
        { typname: 'prescription_revision_state', value: 'ISSUED' },
        { typname: 'prescription_revision_state', value: 'VOIDED' },
        { typname: 'treatment_plan_state', value: 'DRAFT' },
        { typname: 'treatment_plan_state', value: 'ACTIVE' },
        { typname: 'treatment_plan_state', value: 'COMPLETED' },
        { typname: 'treatment_plan_state', value: 'VOIDED' },
        { typname: 'treatment_task_state', value: 'SCHEDULED' },
        { typname: 'treatment_task_state', value: 'COMPLETED' },
        { typname: 'treatment_task_state', value: 'CANCELLED' },
      ]);

      const phaseFourTimestamps = await smokeClient.query<{ data_type: string }>(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'doctor_profiles', 'specialties', 'services', 'doctor_services',
            'availability_rules', 'clinic_closures', 'doctor_availability_exceptions'
          )
          AND column_name IN ('created_at', 'updated_at', 'published_at', 'starts_at', 'ends_at')
      `);
      expect(phaseFourTimestamps.rows.length).toBeGreaterThan(0);
      expect(phaseFourTimestamps.rows.every(
        ({ data_type }) => data_type === 'timestamp with time zone',
      )).toBe(true);

      const overlapConstraints = await smokeClient.query<{
        conname: string;
        contype: string;
      }>(`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conname = ANY($1::text[])
        ORDER BY conname
      `, [[
        'availability_rules_no_active_overlap',
        'clinic_closures_no_active_overlap',
        'doctor_availability_exceptions_no_active_overlap',
      ]]);
      expect(overlapConstraints.rows).toEqual([
        { conname: 'availability_rules_no_active_overlap', contype: 'x' },
        { conname: 'clinic_closures_no_active_overlap', contype: 'x' },
        { conname: 'doctor_availability_exceptions_no_active_overlap', contype: 'x' },
      ]);

      const appointmentOverlapConstraint = await smokeClient.query<{
        conname: string;
        contype: string;
      }>(`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conname = 'appointments_no_active_doctor_overlap'
      `);
      expect(appointmentOverlapConstraint.rows).toEqual([
        { conname: 'appointments_no_active_doctor_overlap', contype: 'x' },
      ]);

      const assessment = await smokeClient.query<{ id: string }>(`
        INSERT INTO assessment_versions (
          id, clinic_id, assessment_key, version_number, title, structure,
          content_hash, updated_at
        )
        SELECT gen_random_uuid(), id, 'MAIN', 1, 'ارزیابی اصلی',
          '{"sections":[]}'::jsonb, repeat('a', 64), CURRENT_TIMESTAMP
        FROM clinics WHERE status = 'ACTIVE'
        RETURNING id
      `);
      const assessmentVersionId = assessment.rows[0]?.id;
      expect(assessmentVersionId).toBeDefined();

      await smokeClient.query(`
        UPDATE assessment_versions
        SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assessmentVersionId]);

      await expect(smokeClient.query(`
        UPDATE assessment_versions
        SET structure = '{"sections":[{"id":"changed"}]}'::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assessmentVersionId])).rejects.toMatchObject({ code: 'P0001' });

      await expect(smokeClient.query(`
        INSERT INTO booking_eligibility_policies (
          id, clinic_id, assessment_requirement, updated_at
        )
        SELECT gen_random_uuid(), id, 'REQUIRED', CURRENT_TIMESTAMP
        FROM clinics WHERE status = 'ACTIVE'
      `)).rejects.toMatchObject({ code: 'P0001' });

      await smokeClient.query(`
        INSERT INTO booking_eligibility_policies (
          id, clinic_id, assessment_requirement,
          required_assessment_version_id, updated_at
        )
        SELECT gen_random_uuid(), clinic_id, 'REQUIRED', id, CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $1
      `, [assessmentVersionId]);

      const policyDefaults = await smokeClient.query<{
        validity_days: number | null;
        require_latest_published_version: boolean;
      }>(`
        SELECT validity_days, require_latest_published_version
        FROM booking_eligibility_policies
      `);
      expect(policyDefaults.rows).toEqual([{
        validity_days: null,
        require_latest_published_version: false,
      }]);

      const draftAssessment = await smokeClient.query<{ id: string }>(`
        INSERT INTO assessment_versions (
          id, clinic_id, assessment_key, version_number, title, structure,
          content_hash, updated_at
        )
        SELECT gen_random_uuid(), clinic_id, 'MAIN', 2, 'ارزیابی اصلی جدید',
          '{"sections":[]}'::jsonb, repeat('b', 64), CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $1
        RETURNING id
      `, [assessmentVersionId]);

      await expect(smokeClient.query(`
        UPDATE booking_eligibility_policies
        SET required_assessment_version_id = $1, updated_at = CURRENT_TIMESTAMP
      `, [draftAssessment.rows[0]?.id])).rejects.toMatchObject({ code: 'P0001' });

      await expect(smokeClient.query(`
        UPDATE assessment_versions
        SET status = 'RETIRED', retired_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assessmentVersionId])).rejects.toMatchObject({ code: 'P0001' });

      const user = await smokeClient.query<{ id: string }>(`
        INSERT INTO users (id, phone, updated_at)
        VALUES (gen_random_uuid(), '+989120000000', CURRENT_TIMESTAMP)
        RETURNING id
      `);
      const userId = user.rows[0]?.id;
      expect(userId).toBeDefined();

      const patient = await smokeClient.query<{ id: string }>(`
        INSERT INTO patient_profiles (id, user_id, clinic_id, updated_at)
        SELECT gen_random_uuid(), $1, clinic_id, CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $2
        RETURNING id
      `, [userId, assessmentVersionId]);
      const patientId = patient.rows[0]?.id;
      expect(patientId).toBeDefined();

      const phaseSevenPrescription = await smokeClient.query<{
        id: string;
      }>(`
        INSERT INTO prescriptions (id, clinic_id, patient_id, updated_at)
        SELECT gen_random_uuid(), clinic_id, $1, CURRENT_TIMESTAMP
        FROM patient_profiles WHERE id = $1
        RETURNING id
      `, [patientId]);
      const prescriptionId = phaseSevenPrescription.rows[0]?.id;
      expect(prescriptionId).toBeDefined();

      const phaseSevenRevision = await smokeClient.query<{ id: string }>(`
        INSERT INTO prescription_revisions (
          id, prescription_id, revision_number, integrity_hash
        ) VALUES (gen_random_uuid(), $1, 1, repeat('a', 64))
        RETURNING id
      `, [prescriptionId]);
      const prescriptionRevisionId = phaseSevenRevision.rows[0]?.id;
      expect(prescriptionRevisionId).toBeDefined();

      await smokeClient.query(`
        INSERT INTO prescription_items (
          id, prescription_revision_id, position, medication_name
        ) VALUES (gen_random_uuid(), $1, 1, 'داروی آزمایشی')
      `, [prescriptionRevisionId]);
      await expect(smokeClient.query(`
        INSERT INTO prescription_items (
          id, prescription_revision_id, position, medication_name
        ) VALUES (gen_random_uuid(), $1, 1, 'داروی تکراری')
      `, [prescriptionRevisionId])).rejects.toMatchObject({ code: '23505' });

      const phaseSevenTreatmentPlan = await smokeClient.query<{ id: string }>(`
        INSERT INTO treatment_plans (id, clinic_id, patient_id, updated_at)
        SELECT gen_random_uuid(), clinic_id, $1, CURRENT_TIMESTAMP
        FROM patient_profiles WHERE id = $1
        RETURNING id
      `, [patientId]);
      const treatmentPlanId = phaseSevenTreatmentPlan.rows[0]?.id;
      expect(treatmentPlanId).toBeDefined();

      await smokeClient.query(`
        INSERT INTO treatment_session_plans (
          id, treatment_plan_id, position, title, goals, updated_at
        ) VALUES (gen_random_uuid(), $1, 1, 'جلسه درمانی آزمایشی', ARRAY['هدف آزمایشی'], CURRENT_TIMESTAMP)
      `, [treatmentPlanId]);
      await expect(smokeClient.query(`
        INSERT INTO treatment_session_plans (
          id, treatment_plan_id, position, title, goals, updated_at
        ) VALUES (gen_random_uuid(), $1, 1, 'جلسه درمانی تکراری', ARRAY['هدف تکراری'], CURRENT_TIMESTAMP)
      `, [treatmentPlanId])).rejects.toMatchObject({ code: '23505' });
      await expect(smokeClient.query(`
        INSERT INTO treatment_session_plans (
          id, treatment_plan_id, position, title, goals, updated_at
        ) VALUES (gen_random_uuid(), gen_random_uuid(), 1, 'جلسه درمانی نامعتبر', ARRAY['هدف نامعتبر'], CURRENT_TIMESTAMP)
      `)).rejects.toMatchObject({ code: '23503' });

      const phaseSevenMedication = await smokeClient.query<{ id: string }>(`
        INSERT INTO treatment_medications (id, treatment_plan_id, name, updated_at)
        VALUES (gen_random_uuid(), $1, 'داروی برنامه درمانی', CURRENT_TIMESTAMP)
        RETURNING id
      `, [treatmentPlanId]);
      const treatmentMedicationId = phaseSevenMedication.rows[0]?.id;
      expect(treatmentMedicationId).toBeDefined();

      const phaseSevenTask = await smokeClient.query<{ id: string }>(`
        INSERT INTO treatment_tasks (id, treatment_plan_id, kind, scheduled_for, updated_at)
        VALUES (gen_random_uuid(), $1, 'MEDICATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [treatmentPlanId]);
      const treatmentTaskId = phaseSevenTask.rows[0]?.id;
      expect(treatmentTaskId).toBeDefined();

      await smokeClient.query(`
        INSERT INTO medication_adherence_logs (
          id, treatment_medication_id, treatment_task_id, idempotency_key
        ) VALUES (gen_random_uuid(), $1, $2, 'phase-seven-adherence-key')
      `, [treatmentMedicationId, treatmentTaskId]);
      await expect(smokeClient.query(`
        INSERT INTO medication_adherence_logs (
          id, treatment_medication_id, treatment_task_id, idempotency_key
        ) VALUES (gen_random_uuid(), $1, $2, 'phase-seven-adherence-key')
      `, [treatmentMedicationId, treatmentTaskId])).rejects.toMatchObject({ code: '23505' });

      await expect(smokeClient.query(`
        INSERT INTO treatment_progress_events (
          id, treatment_plan_id, treatment_task_id, event_type
        ) VALUES (gen_random_uuid(), $1, gen_random_uuid(), 'TASK_COMPLETED')
      `, [treatmentPlanId])).rejects.toMatchObject({ code: '23503' });

      const doctor = await smokeClient.query<{ id: string }>(`
        INSERT INTO doctor_profiles (id, clinic_id, display_name, updated_at)
        SELECT gen_random_uuid(), clinic_id, 'پزشک نوبت آزمایشی', CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $1
        RETURNING id
      `, [assessmentVersionId]);
      const doctorId = doctor.rows[0]?.id;
      expect(doctorId).toBeDefined();

      const service = await smokeClient.query<{ id: string }>(`
        INSERT INTO services (id, clinic_id, name, canonical_name, updated_at)
        SELECT gen_random_uuid(), clinic_id, 'خدمت نوبت آزمایشی', 'خدمت نوبت آزمایشی', CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $1
        RETURNING id
      `, [assessmentVersionId]);
      const serviceId = service.rows[0]?.id;
      expect(serviceId).toBeDefined();

      const doctorService = await smokeClient.query<{ id: string }>(`
        INSERT INTO doctor_services (
          id, clinic_id, doctor_id, service_id, visit_mode,
          duration_minutes, price_amount, updated_at
        )
        SELECT gen_random_uuid(), clinic_id, $1, $2, 'IN_PERSON', 30, 500000, CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $3
        RETURNING id
      `, [doctorId, serviceId, assessmentVersionId]);
      const doctorServiceId = doctorService.rows[0]?.id;
      expect(doctorServiceId).toBeDefined();

      const insertAppointment = (startsAt: string, endsAt: string, status: string) => smokeClient.query(`
        INSERT INTO appointments (
          id, clinic_id, patient_id, doctor_service_id, doctor_id,
          starts_at, ends_at, status, price_amount, price_captured_at, updated_at
        )
        SELECT gen_random_uuid(), clinic_id, $1, $2, $3,
          $4::timestamptz, $5::timestamptz, $6::appointment_status,
          500000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $7
      `, [patientId, doctorServiceId, doctorId, startsAt, endsAt, status, assessmentVersionId]);

      await insertAppointment('2026-09-15T09:00:00Z', '2026-09-15T10:00:00Z', 'PENDING');
      await insertAppointment('2026-09-15T10:00:00Z', '2026-09-15T11:00:00Z', 'PENDING');
      await expect(insertAppointment(
        '2026-09-15T09:30:00Z', '2026-09-15T10:30:00Z', 'PENDING',
      )).rejects.toMatchObject({
        code: '23P01',
        constraint: 'appointments_no_active_doctor_overlap',
      });
      await insertAppointment('2026-09-15T09:30:00Z', '2026-09-15T10:30:00Z', 'CANCELLED');

      const encounterAppointment = await smokeClient.query<{ id: string; clinic_id: string }>(`
        INSERT INTO appointments (
          id, clinic_id, patient_id, doctor_service_id, doctor_id,
          starts_at, ends_at, status, price_amount, price_captured_at, updated_at
        )
        SELECT gen_random_uuid(), clinic_id, $1, $2, $3,
          '2026-09-16T09:00:00Z'::timestamptz, '2026-09-16T10:00:00Z'::timestamptz,
          'IN_PROGRESS', 500000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM assessment_versions WHERE id = $4
        RETURNING id, clinic_id
      `, [patientId, doctorServiceId, doctorId, assessmentVersionId]);
      const encounterAppointmentId = encounterAppointment.rows[0]?.id;
      const encounterClinicId = encounterAppointment.rows[0]?.clinic_id;
      expect(encounterAppointmentId).toBeDefined();
      expect(encounterClinicId).toBeDefined();

      await expect(smokeClient.query(`
        INSERT INTO encounters (
          id, clinic_id, appointment_id, patient_id, doctor_id, started_by_user_id, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [encounterClinicId, encounterAppointmentId, patientId, doctorId, userId])).resolves.toBeDefined();

      const encounter = await smokeClient.query<{ id: string }>(`
        SELECT id FROM encounters WHERE appointment_id = $1
      `, [encounterAppointmentId]);
      const encounterId = encounter.rows[0]?.id;
      expect(encounterId).toBeDefined();

      await expect(smokeClient.query(`
        INSERT INTO encounters (
          id, clinic_id, appointment_id, patient_id, doctor_id, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [encounterClinicId, encounterAppointmentId, patientId, doctorId])).rejects.toMatchObject({ code: '23505' });

      await expect(smokeClient.query(`
        UPDATE encounters SET state = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1
      `, [encounterId])).rejects.toMatchObject({ code: '23514', constraint: 'encounters_state_timestamps_check' });

      await smokeClient.query(`
        UPDATE encounters
        SET state = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, completed_by_user_id = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [encounterId, userId]);

      const clinicalNote = await smokeClient.query<{ id: string }>(`
        INSERT INTO clinical_notes (id, clinic_id, patient_id, encounter_id, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `, [encounterClinicId, patientId, encounterId]);
      const clinicalNoteId = clinicalNote.rows[0]?.id;
      expect(clinicalNoteId).toBeDefined();

      await expect(smokeClient.query(`
        INSERT INTO clinical_note_revisions (
          id, clinical_note_id, revision_number, state, content, signed_at, created_at
        ) VALUES (gen_random_uuid(), $1, 1, 'SIGNED', 'یادداشت امضاشده', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [clinicalNoteId])).rejects.toMatchObject({ code: '23514', constraint: 'clinical_note_revisions_signed_integrity_check' });

      const signedRevision = await smokeClient.query<{ id: string }>(`
        INSERT INTO clinical_note_revisions (
          id, clinical_note_id, revision_number, state, content, integrity_hash,
          signed_at, signed_by_user_id, created_at
        ) VALUES (
          gen_random_uuid(), $1, 1, 'SIGNED', 'یادداشت امضاشده', repeat('a', 64),
          CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP
        ) RETURNING id
      `, [clinicalNoteId, userId]);
      const signedRevisionId = signedRevision.rows[0]?.id;
      expect(signedRevisionId).toBeDefined();

      await expect(smokeClient.query(`
        UPDATE clinical_note_revisions
        SET published_at = CURRENT_TIMESTAMP, published_by_user_id = $2
        WHERE id = $1
      `, [signedRevisionId, userId])).rejects.toMatchObject({ code: '23514', constraint: 'clinical_note_revisions_patient_publication_check' });

      await smokeClient.query(`
        UPDATE clinical_note_revisions
        SET patient_summary = 'خلاصه مجاز بیمار', published_at = CURRENT_TIMESTAMP, published_by_user_id = $2
        WHERE id = $1
      `, [signedRevisionId, userId]);

      await expect(smokeClient.query(`
        INSERT INTO diagnoses (
          id, clinic_id, patient_id, source_intake_revision_id, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, gen_random_uuid(), CURRENT_TIMESTAMP)
      `, [encounterClinicId, patientId])).rejects.toMatchObject({ code: '23514', constraint: 'diagnoses_source_reference_check' });

      const sourceIntake = await smokeClient.query<{ id: string }>(`
        INSERT INTO patient_medical_intakes (id, patient_id, clinic_id, updated_at)
        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
        RETURNING id
      `, [patientId, encounterClinicId]);
      const sourceIntakeId = sourceIntake.rows[0]?.id;
      expect(sourceIntakeId).toBeDefined();

      await expect(smokeClient.query(`
        INSERT INTO diagnoses (
          id, clinic_id, patient_id, source_intake_id, source_intake_revision_id,
          source_intake_revision_number, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), 1, CURRENT_TIMESTAMP)
      `, [encounterClinicId, patientId, sourceIntakeId])).rejects.toMatchObject({
        code: '23503', constraint: 'diagnoses_source_intake_revision_id_fkey',
      });

      await smokeClient.query(`
        INSERT INTO diagnoses (id, clinic_id, patient_id, updated_at)
        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
      `, [encounterClinicId, patientId]);

      await expect(smokeClient.query(`
        INSERT INTO patient_access_audits (
          id, clinic_id, patient_id, action, resource_type, metadata
        ) VALUES (gen_random_uuid(), $1, $2, 'READ', 'ENCOUNTER', '[]'::jsonb)
      `, [encounterClinicId, patientId])).rejects.toMatchObject({ code: '23514', constraint: 'patient_access_audits_safe_shape_check' });

      await smokeClient.query(`
        INSERT INTO patient_access_audits (
          id, clinic_id, patient_id, actor_user_id, action, resource_type,
          resource_id, resource_revision_id, request_id, correlation_id, metadata
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'READ', 'CLINICAL_NOTE', $4, $5,
          'request-1', 'correlation-1', '{"state":"SIGNED"}'::jsonb
        )
      `, [encounterClinicId, patientId, userId, clinicalNoteId, signedRevisionId]);

      const submission = await smokeClient.query<{ id: string }>(`
        INSERT INTO patient_assessment_submissions (
          id, patient_id, assessment_version_id, answers, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, '{"q1":"a"}'::jsonb, CURRENT_TIMESTAMP)
        RETURNING id
      `, [patientId, assessmentVersionId]);
      const submissionId = submission.rows[0]?.id;

      await expect(smokeClient.query(`
        UPDATE patient_assessment_submissions
        SET state = 'COMPLETE', completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [submissionId])).rejects.toMatchObject({ code: '23514' });

      await smokeClient.query(`
        UPDATE patient_assessment_submissions
        SET state = 'COMPLETE', completed_at = CURRENT_TIMESTAMP,
          result_snapshot = '{"band":"neutral"}'::jsonb,
          completion_idempotency_key = 'complete-attempt-1',
          completion_payload_hash = repeat('c', 64), updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [submissionId]);

      await expect(smokeClient.query(`
        UPDATE patient_assessment_submissions
        SET answers = '{"q1":"changed"}'::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [submissionId])).rejects.toMatchObject({ code: 'P0001' });

      await expect(smokeClient.query(`
        INSERT INTO users (id, phone, updated_at)
        VALUES (gen_random_uuid(), '+989120000000', CURRENT_TIMESTAMP)
      `)).rejects.toMatchObject({ code: '23505' });

      await expect(smokeClient.query(`
        INSERT INTO users (id, phone, updated_at)
        VALUES (gen_random_uuid(), '09123456789', CURRENT_TIMESTAMP)
      `)).rejects.toMatchObject({ code: '23514' });

      await smokeClient.query(`
        INSERT INTO credentials (id, user_id, password_hash, updated_at)
        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
      `, [userId, 'argon2id-placeholder']);

      await expect(smokeClient.query(`
        INSERT INTO credentials (id, user_id, password_hash, updated_at)
        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
      `, [userId, 'second-placeholder'])).rejects.toMatchObject({ code: '23505' });

      await expect(smokeClient.query(`
        INSERT INTO sessions (
          id, user_id, refresh_token_hash, expires_at
        ) VALUES (
          gen_random_uuid(), $1, repeat('a', 64), CURRENT_TIMESTAMP - INTERVAL '1 minute'
        )
      `, [userId])).rejects.toMatchObject({ code: '23514' });

      await expect(smokeClient.query(`
        INSERT INTO sessions (
          id, user_id, refresh_token_hash, expires_at, revoked_reason
        ) VALUES (
          gen_random_uuid(), $1, repeat('b', 64), CURRENT_TIMESTAMP + INTERVAL '1 day', 'LOGOUT'
        )
      `, [userId])).rejects.toMatchObject({ code: '23514' });

      await smokeClient.query(`
        DROP INDEX "users_phone_key";
        ALTER TABLE "users"
          DROP CONSTRAINT "users_phone_format_check",
          ALTER COLUMN "phone" TYPE VARCHAR(32);
        CREATE INDEX "users_phone_idx" ON "users"("phone");
        INSERT INTO "users" ("id", "phone", "updated_at")
        VALUES
          (gen_random_uuid(), '۰۹۱۳ ۱۲۳ ۴۵۶۷', CURRENT_TIMESTAMP),
          (gen_random_uuid(), '00989141112233', CURRENT_TIMESTAMP);
      `);

      const canonicalPhoneMigration = readFileSync(
        resolve(
          process.cwd(),
          'prisma/migrations/20260821081500_canonical_phone/migration.sql',
        ),
        'utf8',
      );
      await smokeClient.query(canonicalPhoneMigration);

      const normalizedPhones = await smokeClient.query<{ phone: string }>(`
        SELECT phone
        FROM users
        WHERE phone IN ('+989131234567', '+989141112233')
        ORDER BY phone
      `);

      expect(normalizedPhones.rows.map(({ phone }) => phone)).toEqual([
        '+989131234567',
        '+989141112233',
      ]);
    } finally {
      await smokeClient.end();
    }
  }, 60_000);

  it('backfills only Phase 01 patient accounts without inventing intake data', async () => {
    const upgradeDatabaseName = `sabz_zendegi_upgrade_${randomUUID().replaceAll('-', '')}`;
    const upgradeDatabaseUrl = createDatabaseUrl(upgradeDatabaseName);
    await adminClient.query(`CREATE DATABASE "${upgradeDatabaseName}"`);

    const upgradeClient = new Client({ connectionString: upgradeDatabaseUrl });
    await upgradeClient.connect();
    try {
      const legacyMigrations = [
        '20260820130000_init',
        '20260820195000_identity_models',
        '20260821081500_canonical_phone',
        '20260821084000_seed_identity_roles',
        '20260822143500_login_attempt_pending',
        '20260824095500_public_auth_rate_limits',
      ];
      for (const migration of legacyMigrations) {
        await upgradeClient.query(readFileSync(
          resolve(process.cwd(), `prisma/migrations/${migration}/migration.sql`),
          'utf8',
        ));
      }

      const createdAt = new Date('2026-01-15T08:30:00.000Z');
      const patient = await upgradeClient.query<{ id: string }>(`
        INSERT INTO users (id, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), '+989121234567', $1, $1)
        RETURNING id
      `, [createdAt]);
      const nonPatient = await upgradeClient.query<{ id: string }>(`
        INSERT INTO users (id, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), '+989122345678', $1, $1)
        RETURNING id
      `, [createdAt]);
      await upgradeClient.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE code = 'PATIENT'
      `, [patient.rows[0]?.id]);
      await upgradeClient.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, id FROM roles WHERE code = 'DOCTOR'
      `, [nonPatient.rows[0]?.id]);

      for (const migration of [
        '20260824144413_patient_onboarding_schema',
        '20260824152139_patient_onboarding_contract_enums',
        '20260824154500_patient_onboarding_contract_enum_values',
      ]) {
        await upgradeClient.query(readFileSync(
          resolve(process.cwd(), `prisma/migrations/${migration}/migration.sql`),
          'utf8',
        ));
      }

      const profiles = await upgradeClient.query<{
        user_id: string;
        created_at: Date;
      }>(`
        SELECT user_id, created_at
        FROM patient_profiles
        ORDER BY user_id
      `);
      expect(profiles.rows).toHaveLength(1);
      expect(profiles.rows[0]?.user_id).toBe(patient.rows[0]?.id);
      expect(profiles.rows[0]?.created_at).toEqual(createdAt);

      const noInventedRows = await upgradeClient.query<{
        user_profiles: string;
        intakes: string;
        revisions: string;
        consents: string;
      }>(`
        SELECT
          (SELECT count(*)::text FROM user_profiles) AS user_profiles,
          (SELECT count(*)::text FROM patient_medical_intakes) AS intakes,
          (SELECT count(*)::text FROM patient_medical_intake_revisions) AS revisions,
          (SELECT count(*)::text FROM patient_consent_records) AS consents
      `);
      expect(noInventedRows.rows[0]).toEqual({
        user_profiles: '0', intakes: '0', revisions: '0', consents: '0',
      });
    } finally {
      await upgradeClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS "${upgradeDatabaseName}"`);
    }
  });
});
