import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_smoke_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client;

const createDatabaseUrl = (): string => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for the migration smoke test.');
  }

  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;

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
      ]]);

      expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
        'audit_events',
        'credentials',
        'login_attempts',
        'roles',
        'sessions',
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

      const timestampColumns = await smokeClient.query<{ data_type: string }>(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'credentials', 'sessions', 'roles', 'user_roles', 'login_attempts', 'audit_events')
          AND column_name IN ('created_at', 'updated_at', 'last_used_at', 'expires_at', 'revoked_at', 'assigned_at', 'password_changed_at')
      `);

      expect(timestampColumns.rows.length).toBeGreaterThan(0);
      expect(timestampColumns.rows.every(({ data_type }) => data_type === 'timestamp with time zone')).toBe(true);

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
  });
});
