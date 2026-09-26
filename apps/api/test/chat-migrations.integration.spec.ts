import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_chat_migration_${randomUUID().replaceAll('-', '')}`;
const seedEnvironment = { ...process.env, DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
let adminClient: Client;

const createDatabaseUrl = (): string => {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the chat migration test.');
  const url = new URL(databaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const applyMigration = async (client: Client, name: string): Promise<void> => {
  await client.query(readFileSync(resolve(process.cwd(), `prisma/migrations/${name}/migration.sql`), 'utf8'));
};

describe('Phase 10 chat persistence migrations', () => {
  beforeAll(async () => {
    if (!databaseUrl) throw new Error('DATABASE_URL is required for the chat migration test.');
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  });

  afterAll(async () => {
    if (!adminClient) return;
    try {
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    } finally {
      await adminClient.end().catch(() => undefined);
    }
  });

  it('upgrades the accepted Phase 09 schema additively and preserves the frozen persistence invariants', async () => {
    const upgradeClient = new Client({ connectionString: createDatabaseUrl() });
    await upgradeClient.connect();
    try {
      const phaseNineMigrations = readdirSync(resolve(process.cwd(), 'prisma/migrations'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => name <= '20260913204000_phase_09_payment_immutability_trigger_fix')
        .sort();
      for (const migration of phaseNineMigrations) await applyMigration(upgradeClient, migration);
      await applyMigration(upgradeClient, '20260916034500_phase_10_chat_persistence');
      await applyMigration(upgradeClient, '20260927090000_phase_10_chat_rate_limit_indexes');
    } finally {
      await upgradeClient.end();
    }

    for (let run = 0; run < 2; run += 1) {
      const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], {
        cwd: process.cwd(),
        env: { ...seedEnvironment, DATABASE_URL: createDatabaseUrl() },
        encoding: 'utf8',
      });
      expect(seed.status, seed.stderr).toBe(0);
    }

    const client = new Client({ connectionString: createDatabaseUrl() });
    await client.connect();
    try {
      const tableNames = await client.query<{ table_name: string }>(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])
        ORDER BY table_name
      `, [[
        'chat_conversations', 'chat_conversation_participants', 'chat_messages', 'chat_receipts',
        'chat_moderation_reports', 'chat_moderation_report_decisions', 'chat_conversation_blocks',
        'chat_message_moderation_actions', 'chat_legal_holds', 'chat_audit_events',
      ]]);
      expect(tableNames.rows.map(({ table_name }) => table_name)).toEqual([
        'chat_audit_events', 'chat_conversation_blocks', 'chat_conversation_participants',
        'chat_conversations', 'chat_legal_holds', 'chat_message_moderation_actions', 'chat_messages',
        'chat_moderation_report_decisions', 'chat_moderation_reports', 'chat_receipts',
      ]);

      const rateLimitIndexes = await client.query<{ indexdef: string; indexname: string }>(`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
        ORDER BY indexname
      `, [[
        'chat_messages_conversation_created_at_idx',
        'chat_messages_sender_created_at_idx',
      ]]);
      expect(rateLimitIndexes.rows.map(({ indexname }) => indexname)).toEqual([
        'chat_messages_conversation_created_at_idx',
        'chat_messages_sender_created_at_idx',
      ]);
      expect(rateLimitIndexes.rows[0]?.indexdef).toContain('(conversation_id, created_at)');
      expect(rateLimitIndexes.rows[1]?.indexdef).toContain('(sender_user_id, created_at)');

      const clinic = await client.query<{ id: string }>(`SELECT id FROM clinics WHERE status = 'ACTIVE' LIMIT 1`);
      const onlineService = await client.query<{ doctor_id: string; id: string }>(`
        SELECT id, doctor_id FROM doctor_services WHERE clinic_id = $1 AND visit_mode = 'ONLINE' LIMIT 1
      `, [clinic.rows[0]?.id]);
      const patientUser = await client.query<{ id: string }>(`
        INSERT INTO users (id, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), '+989131234567', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id
      `);
      const patient = await client.query<{ id: string }>(`
        INSERT INTO patient_profiles (id, user_id, clinic_id, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id
      `, [patientUser.rows[0]?.id, clinic.rows[0]?.id]);
      const doctorUser = await client.query<{ id: string }>(`
        INSERT INTO users (id, phone, created_at, updated_at)
        VALUES (gen_random_uuid(), '+989139876543', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id
      `);
      await client.query(`UPDATE doctor_profiles SET user_id = $1 WHERE id = $2`, [
        doctorUser.rows[0]?.id, onlineService.rows[0]?.doctor_id,
      ]);
      const appointment = await client.query<{ id: string }>(`
        INSERT INTO appointments (
          id, clinic_id, patient_id, doctor_service_id, doctor_id, starts_at, ends_at, status,
          price_amount, currency, price_captured_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '45 minutes',
          'CONFIRMED', 0, 'IRR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id
      `, [clinic.rows[0]?.id, patient.rows[0]?.id, onlineService.rows[0]?.id, onlineService.rows[0]?.doctor_id]);
      const conversation = await client.query<{ id: string }>(`
        INSERT INTO chat_conversations (id, clinic_id, appointment_id, patient_id, doctor_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id
      `, [clinic.rows[0]?.id, appointment.rows[0]?.id, patient.rows[0]?.id, onlineService.rows[0]?.doctor_id]);

      await expect(client.query(`
        INSERT INTO chat_conversations (id, clinic_id, appointment_id, patient_id, doctor_id)
        VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3)
      `, [clinic.rows[0]?.id, patient.rows[0]?.id, onlineService.rows[0]?.doctor_id])).rejects.toThrow(
        'chat conversation requires matching online appointment',
      );

      const message = await client.query<{ id: string }>(`
        INSERT INTO chat_messages (
          id, clinic_id, conversation_id, sequence, sender_user_id, sender_kind,
          client_message_id, request_payload_hash, body
        ) VALUES (gen_random_uuid(), $1, $2, 1, $3, 'PATIENT', 'client-1', repeat('a', 64), 'synthetic test message')
        RETURNING id
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, patientUser.rows[0]?.id]);

      await expect(client.query(`
        INSERT INTO chat_messages (
          id, clinic_id, conversation_id, sequence, sender_user_id, sender_kind,
          client_message_id, request_payload_hash, body
        ) VALUES (gen_random_uuid(), $1, $2, 1, $3, 'PATIENT', 'client-2', repeat('b', 64), 'another message')
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, patientUser.rows[0]?.id])).rejects.toThrow();
      await expect(client.query(`UPDATE chat_messages SET body = 'mutated' WHERE id = $1`, [message.rows[0]?.id]))
        .rejects.toThrow('chat message identity and body are immutable');
      await client.query(`
        UPDATE chat_messages
        SET visibility = 'RESTRICTED', restricted_reason_category = 'SPAM_OR_SCAM', restricted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [message.rows[0]?.id]);
      await expect(client.query(`DELETE FROM chat_messages WHERE id = $1`, [message.rows[0]?.id]))
        .rejects.toThrow('chat messages are retained and immutable');

      await client.query(`
        INSERT INTO chat_receipts (id, clinic_id, conversation_id, user_id, last_delivered_sequence, last_read_sequence, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 1, 1, CURRENT_TIMESTAMP)
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, patientUser.rows[0]?.id]);
      await expect(client.query(`
        UPDATE chat_receipts SET last_read_sequence = 0 WHERE conversation_id = $1 AND user_id = $2
      `, [conversation.rows[0]?.id, patientUser.rows[0]?.id])).rejects.toThrow('chat receipt identity and high-water marks are immutable');

      await expect(client.query(`
        INSERT INTO chat_moderation_reports (id, clinic_id, conversation_id, message_id, reporter_user_id, reason_category)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'OTHER')
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, message.rows[0]?.id, doctorUser.rows[0]?.id])).rejects.toThrow();
      await client.query(`
        INSERT INTO chat_moderation_reports (
          id, clinic_id, conversation_id, message_id, reporter_user_id, reason_category, reporter_note
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'OTHER', 'synthetic non-sensitive category note')
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, message.rows[0]?.id, doctorUser.rows[0]?.id]);
      await expect(client.query(`
        INSERT INTO chat_moderation_reports (
          id, clinic_id, conversation_id, message_id, reporter_user_id, reason_category, reporter_note
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'SPAM_OR_SCAM', 'duplicate reporter')
      `, [clinic.rows[0]?.id, conversation.rows[0]?.id, message.rows[0]?.id, doctorUser.rows[0]?.id])).rejects.toThrow();

      const seededClinicCount = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM clinics WHERE status = 'ACTIVE'`);
      expect(seededClinicCount.rows[0]?.count).toBe('1');
    } finally {
      await client.end();
    }
  });
});
