import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const runId = randomUUID().replaceAll('-', '');
const freshDatabase = `mushroom_f12t10_fresh_${runId}`;
const upgradeDatabase = `mushroom_f12t10_upgrade_${runId}`;
const phaseNineBaseline = '20260913204000_phase_09_payment_immutability_trigger_fix';
const phaseTenMigrations = [
  '20260916034500_phase_10_chat_persistence',
  '20260927090000_phase_10_chat_rate_limit_indexes',
];

let admin: Client;

function databaseUrlFor(name: string): string {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the Phase 12 migration rehearsal.');
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

function migrationNames(): string[] {
  return readdirSync(resolve(process.cwd(), 'prisma/migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function runPrisma(args: string[], targetUrl: string) {
  return spawnSync(
    process.execPath,
    [resolve(process.cwd(), 'node_modules/prisma/build/index.js'), ...args, '--config', 'prisma.config.ts'],
    { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: targetUrl }, encoding: 'utf8' },
  );
}

async function applyMigration(client: Client, migration: string): Promise<void> {
  await client.query(readFileSync(resolve(process.cwd(), `prisma/migrations/${migration}/migration.sql`), 'utf8'));
}

describe('Phase 12 migration and application-rollback rehearsal', () => {
  beforeAll(async () => {
    if (!databaseUrl) throw new Error('DATABASE_URL is required for the Phase 12 migration rehearsal.');
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    admin = new Client({ connectionString: adminUrl.toString() });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${freshDatabase}"`);
    await admin.query(`CREATE DATABASE "${upgradeDatabase}"`);
  });

  afterAll(async () => {
    if (!admin) return;
    try {
      for (const database of [freshDatabase, upgradeDatabase]) {
        await admin.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
          [database],
        );
        await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
      }
    } finally {
      await admin.end().catch(() => undefined);
    }
  });

  it('replays the complete immutable history and reports no pending migration', async () => {
    const migrations = migrationNames();
    expect(migrations).toHaveLength(33);

    const deploy = runPrisma(['migrate', 'deploy'], databaseUrlFor(freshDatabase));
    expect(deploy.status, deploy.stderr).toBe(0);
    const status = runPrisma(['migrate', 'status'], databaseUrlFor(freshDatabase));
    expect(status.status, status.stderr).toBe(0);

    const client = new Client({ connectionString: databaseUrlFor(freshDatabase) });
    await client.connect();
    try {
      const applied = await client.query<{ migration_name: string }>(
        'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name',
      );
      expect(applied.rows.map((row) => row.migration_name)).toEqual(migrations);
    } finally {
      await client.end();
    }
  }, 60_000);

  it('upgrades the previous Phase 09 schema forward-only through the accepted Phase 10 migrations', async () => {
    const client = new Client({ connectionString: databaseUrlFor(upgradeDatabase) });
    await client.connect();
    try {
      const baseline = migrationNames().filter((migration) => migration <= phaseNineBaseline);
      expect(baseline).toContain(phaseNineBaseline);
      for (const migration of baseline) await applyMigration(client, migration);

      for (const migration of phaseTenMigrations) {
        const sql = readFileSync(resolve(process.cwd(), `prisma/migrations/${migration}/migration.sql`), 'utf8');
        expect(sql).not.toMatch(/\b(DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM)\b/i);
        await client.query(sql);
      }

      const tables = await client.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
        ORDER BY table_name
      `, [[
        'chat_audit_events', 'chat_conversation_blocks', 'chat_conversation_participants', 'chat_conversations',
        'chat_legal_holds', 'chat_message_moderation_actions', 'chat_messages',
        'chat_moderation_report_decisions', 'chat_moderation_reports', 'chat_receipts',
      ]]);
      expect(tables.rows).toHaveLength(10);

      const indexes = await client.query<{ indexname: string }>(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
        ORDER BY indexname
      `, [[
        'chat_messages_conversation_created_at_idx',
        'chat_messages_sender_created_at_idx',
      ]]);
      expect(indexes.rows.map((row) => row.indexname)).toEqual([
        'chat_messages_conversation_created_at_idx',
        'chat_messages_sender_created_at_idx',
      ]);
    } finally {
      await client.end();
    }
  });
});
