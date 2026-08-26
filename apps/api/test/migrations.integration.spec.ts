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
      ]]);

      expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
        'audit_events',
        'clinics',
        'consent_policy_versions',
        'credentials',
        'login_attempts',
        'patient_consent_records',
        'patient_medical_intake_revisions',
        'patient_medical_intakes',
        'patient_profiles',
        'roles',
        'sessions',
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

      const user = await smokeClient.query<{ id: string }>(`
        INSERT INTO users (id, phone, updated_at)
        VALUES (gen_random_uuid(), '+989120000000', CURRENT_TIMESTAMP)
        RETURNING id
      `);
      const userId = user.rows[0]?.id;
      expect(userId).toBeDefined();

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
