import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AccessTokenService } from '../src/common/auth/access-token.service';
import type { PrismaService } from '../src/database/prisma/prisma.service';

const sourceDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_reporting_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client;
let app: NestFastifyApplication;
let prisma: PrismaService;
let tokens: AccessTokenService;

const databaseUrl = () => {
  if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for reporting integration tests.');
  const url = new URL(sourceDatabaseUrl); url.pathname = `/${databaseName}`; return url.toString();
};

describe('Phase 11 domain reporting (disposable PostgreSQL API integration)', () => {
  beforeAll(async () => {
    if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for reporting integration tests.');
    const adminUrl = new URL(sourceDatabaseUrl); adminUrl.pathname = '/postgres'; adminClient = new Client({ connectionString: adminUrl.toString() }); await adminClient.connect(); await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const schemaSync = spawnSync(process.execPath, [prismaCli, 'db', 'push', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl() }, encoding: 'utf8' });
    expect(schemaSync.status, schemaSync.stderr).toBe(0);
    const disposableClient = new Client({ connectionString: databaseUrl() }); await disposableClient.connect();
    expect((await disposableClient.query<{ table: string | null }>("SELECT to_regclass('public.treatment_plans') AS table")).rows[0].table).toBe('treatment_plans');
    await disposableClient.end();
    process.env.DATABASE_URL = databaseUrl();
    const { createApiApplication } = await import('../src/app.factory.js');
    const { PrismaService } = await import('../src/database/prisma/prisma.service.js');
    const { AccessTokenService } = await import('../src/common/auth/access-token.service.js');
    app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService);
    expect((await prisma.$queryRawUnsafe<{ database: string }[]>('SELECT current_database() AS database'))[0].database).toBe(databaseName);
  }, 60_000);

  afterAll(async () => {
    await app?.close(); process.env.DATABASE_URL = sourceDatabaseUrl;
    if (adminClient) { try { await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`); } finally { await adminClient.end(); } }
  });

  it('returns only clinic-scoped, Tehran-bounded aggregate data without medical payloads', async () => {
    const clinic = await prisma.clinic.create({ data: { name: 'Reporting clinic', timeZone: 'Asia/Tehran', status: 'ACTIVE' } });
    const otherClinic = await prisma.clinic.create({ data: { name: 'Other reporting clinic', timeZone: 'Asia/Tehran', status: 'INACTIVE' } });
    const testPhone = `+989${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;
    const user = await prisma.user.create({ data: { phone: testPhone, userProfile: { create: { firstName: 'Ada', lastName: 'Test' } }, patientProfile: { create: { clinicId: clinic.id } } }, include: { patientProfile: true } });
    const patientId = user.patientProfile!.id;
    const plan = await prisma.treatmentPlan.create({ data: { clinicId: clinic.id, patientId, state: 'ACTIVE' } });
    await prisma.treatmentTask.createMany({ data: [
      { treatmentPlanId: plan.id, kind: 'EXERCISE', state: 'SCHEDULED', scheduledFor: new Date('2026-03-20T20:30:00.000Z') },
      { treatmentPlanId: plan.id, kind: 'EXERCISE', state: 'COMPLETED', scheduledFor: new Date('2026-03-20T20:30:00.000Z'), completedAt: new Date('2026-03-20T20:45:00.000Z') },
    ] });
    const assessmentVersion = await prisma.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey: 'reporting-test', versionNumber: 1, title: 'Reporting test', structure: {}, contentHash: 'a'.repeat(64), status: 'DRAFT' } });
    await prisma.patientAssessmentSubmission.createMany({ data: [
      { patientId, assessmentVersionId: assessmentVersion.id, attemptNumber: 1, state: 'IN_PROGRESS', startedAt: new Date('2026-03-20T20:30:00.000Z') },
      { patientId, assessmentVersionId: assessmentVersion.id, attemptNumber: 2, state: 'COMPLETE', startedAt: new Date('2026-03-20T20:30:00.000Z'), completedAt: new Date('2026-03-20T20:45:00.000Z') },
    ] });
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');
      await tx.$executeRawUnsafe(`INSERT INTO appointments (id, clinic_id, patient_id, doctor_service_id, doctor_id, starts_at, ends_at, status, price_amount, currency, price_captured_at, checked_in_at, started_at, completed_at, created_at, updated_at) VALUES ('${randomUUID()}', '${clinic.id}', '${patientId}', '${randomUUID()}', '${randomUUID()}', '2026-03-20T20:30:00.000Z', '2026-03-20T21:30:00.000Z', 'COMPLETED', 0, 'IRR', '2026-03-20T20:00:00.000Z', '2026-03-20T20:30:00.000Z', '2026-03-20T20:40:00.000Z', '2026-03-20T20:50:00.000Z', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO appointments (id, clinic_id, patient_id, doctor_service_id, doctor_id, starts_at, ends_at, status, price_amount, currency, price_captured_at, cancelled_at, created_at, updated_at) VALUES ('${randomUUID()}', '${otherClinic.id}', '${patientId}', '${randomUUID()}', '${randomUUID()}', '2026-03-20T20:30:00.000Z', '2026-03-20T21:30:00.000Z', 'CANCELLED', 0, 'IRR', '2026-03-20T20:00:00.000Z', '2026-03-20T20:50:00.000Z', now(), now())`);
    });
    const adminUser = await prisma.user.create({ data: { phone: `+989${Math.floor(100_000_000 + Math.random() * 900_000_000)}` } });
    const adminSession = await prisma.session.create({ data: { userId: adminUser.id, refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''), expiresAt: new Date(Date.now() + 3_600_000) } });
    const admin = await tokens.issue({ userId: adminUser.id, sessionId: adminSession.id, roles: ['ADMIN'] });
    const headers = { authorization: `Bearer ${admin}` };
    const suffix = `?clinicId=${clinic.id}&from=2026-03-20&to=2026-03-21`;
    const appointments = await app.inject({ method: 'GET', url: `/v1/admin/reporting/appointments${suffix}&limit=1`, headers });
    expect(appointments.statusCode).toBe(200); expect(appointments.json()).toMatchObject({ clinicId: clinic.id, timeZone: 'Asia/Tehran', from: '2026-03-20', to: '2026-03-21', sourceStatus: 'current', scheduled: 1, completed: 1, cancelled: 0, noShow: 0, completionRate: 100, averageWaitMinutes: 10 }); expect(appointments.json().items[0]).not.toHaveProperty('patientId');
    const beforeTehranMidnight = await app.inject({ method: 'GET', url: `/v1/admin/reporting/appointments?clinicId=${clinic.id}&from=2026-03-20&to=2026-03-20`, headers });
    expect(beforeTehranMidnight.statusCode).toBe(200); expect(beforeTehranMidnight.json()).toMatchObject({ scheduled: 0, completed: 0, completionRate: null, averageWaitMinutes: null, sourceStatus: 'current' });
    const patients = await app.inject({ method: 'GET', url: `/v1/admin/reporting/patients${suffix}`, headers });
    expect(patients.statusCode).toBe(200); expect(patients.json()).toMatchObject({ clinicId: clinic.id, newPatients: 0, onboardingComplete: 0, onboardingIncomplete: 1, sourceStatus: 'current' }); expect(patients.json()).not.toHaveProperty('items');
    const assessments = await app.inject({ method: 'GET', url: `/v1/admin/reporting/assessments${suffix}`, headers });
    expect(assessments.statusCode).toBe(200); expect(assessments.json()).toMatchObject({ clinicId: clinic.id, started: 2, completed: 1, completionRate: 50, sourceStatus: 'current' });
    const treatments = await app.inject({ method: 'GET', url: `/v1/admin/reporting/treatments${suffix}`, headers });
    expect(treatments.statusCode).toBe(200); expect(treatments.json()).toMatchObject({ clinicId: clinic.id, activePlans: 1, dueTasks: 1, completedTasks: 1, completionRate: 50, sourceStatus: 'current' });
    const unsupported = await app.inject({ method: 'GET', url: `/v1/admin/reporting/patients${suffix}&cursor=unsafe`, headers }); expect(unsupported.statusCode).toBe(400);
    const invalidRange = await app.inject({ method: 'GET', url: `/v1/admin/reporting/appointments?clinicId=${clinic.id}&from=2026-02-30&to=2026-03-01`, headers }); expect(invalidRange.statusCode).toBe(400);
    const nonAdmin = await tokens.issue({ userId: randomUUID(), sessionId: randomUUID(), roles: ['PATIENT'] });
    const forbidden = await app.inject({ method: 'GET', url: `/v1/admin/reporting/patients${suffix}`, headers: { authorization: `Bearer ${nonAdmin}` } }); expect(forbidden.statusCode).toBe(403);
  }, 60_000);
});
