import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Prisma } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/database/prisma/prisma.service';

type ExplainDocument = Array<{ Plan: Record<string, unknown>; 'Planning Time': number; 'Execution Time': number }>;
type ExplainRow = { 'QUERY PLAN': ExplainDocument };

const sourceDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_phase_12_performance_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client | undefined;
let observerClient: Client | undefined;
let app: NestFastifyApplication | undefined;
let prisma: PrismaService;
let clinicId: string;

const databaseUrl = () => {
  if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for Phase 12 performance review.');
  const url = new URL(sourceDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

async function explain(name: string, statement: Prisma.Sql) {
  const rows = await prisma.$queryRaw<ExplainRow[]>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, FORMAT JSON) ${statement}`);
  const document = rows[0]?.['QUERY PLAN'];
  const root = document?.[0];
  expect(root).toBeDefined();
  const summary = {
    name,
    nodeType: String(root?.Plan['Node Type']),
    planningMs: root?.['Planning Time'],
    executionMs: root?.['Execution Time'],
    hasClinicScope: JSON.stringify(root?.Plan).includes(clinicId),
  };
  expect(summary.planningMs).toEqual(expect.any(Number));
  expect(summary.executionMs).toEqual(expect.any(Number));
  expect(summary.hasClinicScope).toBe(true);
  return summary;
}

describe('F12-T04 measured performance review (disposable PostgreSQL)', () => {
  beforeAll(async () => {
    if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for Phase 12 performance review.');
    const adminUrl = new URL(sourceDatabaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    observerClient = new Client({ connectionString: adminUrl.toString() });
    await observerClient.connect();

    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const environment = { ...process.env, DATABASE_URL: databaseUrl(), DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(seed.status, seed.stderr).toBe(0);

    process.env.DATABASE_URL = databaseUrl();
    const { createApiApplication } = await import('../src/app.factory.js');
    const { PrismaService } = await import('../src/database/prisma/prisma.service.js');
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    clinicId = (await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' }, select: { id: true } })).id;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    process.env.DATABASE_URL = sourceDatabaseUrl;
    await observerClient?.end().catch(() => undefined);
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      await adminClient.end().catch(() => undefined);
    }
  });

  it('captures the release query shapes without inferring a bottleneck or adding speculative indexes', async () => {
    const plans = await Promise.all([
      explain('directory-active-offerings', Prisma.sql`SELECT id, doctor_id, service_id FROM doctor_services WHERE clinic_id = ${clinicId}::uuid AND is_active = true ORDER BY id ASC LIMIT ${25}`),
      explain('patient-appointment-history', Prisma.sql`SELECT id, starts_at, status FROM appointments WHERE clinic_id = ${clinicId}::uuid ORDER BY starts_at DESC, id DESC LIMIT ${25}`),
      explain('payment-reconciliation', Prisma.sql`SELECT attempt.id, attempt.status FROM payment_attempts AS attempt JOIN commerce_orders AS orders ON orders.id = attempt.order_id WHERE orders.clinic_id = ${clinicId}::uuid ORDER BY attempt.created_at DESC LIMIT ${25}`),
    ]);
    console.info(`F12-T04 release query plans: ${JSON.stringify(plans)}`);
  });

  it('holds the existing bounded pool and recovers after a controlled database timeout', async () => {
    const queued = Array.from({ length: 25 }, () => prisma.$queryRaw`SELECT 1 FROM pg_sleep(0.15)`);
    const allQueries = Promise.all(queued);
    await new Promise((resolve) => setTimeout(resolve, 40));
    const active = await observerClient!.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_stat_activity WHERE datname = $1 AND state = 'active' AND query LIKE '%pg_sleep%'", [databaseName]);
    const activeConnections = Number(active.rows[0]?.count ?? 0);
    expect(activeConnections).toBeGreaterThan(0);
    expect(activeConnections).toBeLessThanOrEqual(20);
    await allQueries;

    let timeoutError: unknown;
    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '25ms'");
        await transaction.$queryRawUnsafe('SELECT 1 FROM pg_sleep(0.1)');
      });
    } catch (error) {
      timeoutError = error;
    }
    expect(String(timeoutError)).toMatch(/57014|statement timeout|canceling statement/u);
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });
});
