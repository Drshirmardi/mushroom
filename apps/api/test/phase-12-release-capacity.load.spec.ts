import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { hashPassword } from '../src/modules/identity/infrastructure/password-hasher';

const MIXED_REQUESTS_PER_SECOND = 10;
const MIXED_DURATION_SECONDS = 30 * 60;
const MIXED_P95_LIMIT_MS = 750;
const MIXED_MINIMUM_SUCCESS_RATE = 0.99;
const BOOKING_REQUESTS_PER_SECOND = 2;
const TOKEN_ROTATION_SAFETY_MARGIN_MS = 30_000;
const isPreflight = process.env.F12_T03_CAPACITY_PREFLIGHT === '1';
// This opt-in path is solely a wiring preflight. The acceptance invocation leaves
// the environment variable unset and therefore preserves the approved 30-minute workload.
const runDurationSeconds = isPreflight ? 2 : MIXED_DURATION_SECONDS;

describe('Phase 12 release capacity (synthetic PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let patientId: string;
  let userId: string;
  let sessionId: string;
  let tokenExpiresAtMs = 0;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const databaseName = `sabz_zendegi_phase_12_capacity_${randomUUID().replaceAll('-', '')}`;
  let adminClient: Client | undefined;

  const headers = (idempotencyKey?: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) });
  const readTokenExpiry = (value: string): number => {
    const encodedPayload = value.split('.')[1];
    if (!encodedPayload) throw new Error('Synthetic access token has no JWT payload.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as { exp?: unknown };
    if (typeof payload.exp !== 'number' || !Number.isInteger(payload.exp)) {
      throw new Error('Synthetic access token has no integer exp claim.');
    }
    return payload.exp * 1_000;
  };

  const rotatePatientToken = async () => {
    token = await app.get(AccessTokenService).issue({ userId, sessionId, roles: ['PATIENT'] });
    tokenExpiresAtMs = readTokenExpiry(token);
    return app.get(AccessTokenService).verify(token);
  };

  const rotateBeforeExpiry = async () => {
    if (Date.now() >= tokenExpiresAtMs - TOKEN_ROTATION_SAFETY_MARGIN_MS) return rotatePatientToken();
    return undefined;
  };

  const databaseUrl = () => {
    if (!originalDatabaseUrl) throw new Error('DATABASE_URL is required for Phase 12 capacity testing.');
    const url = new URL(originalDatabaseUrl); url.pathname = `/${databaseName}`; return url.toString();
  };

  const prepareDatabase = async () => {
    if (!originalDatabaseUrl) throw new Error('DATABASE_URL is required for Phase 12 capacity testing.');
    const adminUrl = new URL(originalDatabaseUrl); adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() }); await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const env = { ...process.env, DATABASE_URL: databaseUrl(), DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env, encoding: 'utf8' });
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { cwd: process.cwd(), env, encoding: 'utf8' });
    expect(seed.status, seed.stderr).toBe(0);
    process.env.DATABASE_URL = databaseUrl();
  };

  const nextWeekday = (weekday: number) => {
    const date = new Date();
    do date.setUTCDate(date.getUTCDate() + 1); while (((date.getUTCDay() + 6) % 7) + 1 !== weekday);
    return date.toISOString().slice(0, 10);
  };

  beforeAll(async () => {
    await prepareDatabase();
    const { createApiApplication } = await import('../src/app.factory.js');
    app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService);
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const policy = await prisma.consentPolicyVersion.findFirstOrThrow({ where: { clinicId: clinic.id, policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: 'ACTIVE' } });
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }); userId = user.id;
    await prisma.credential.create({ data: { userId, passwordHash: await hashPassword('correct horse battery staple') } });
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId: clinic.id } }); patientId = profile.id;
    await prisma.userProfile.create({ data: { userId: user.id, firstName: 'Capacity', lastName: 'Patient' } });
    const consent = await prisma.patientConsentRecord.create({ data: { patientId: profile.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: user.id, acceptanceIdempotencyKey: randomUUID() } });
    const intake = await prisma.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId: clinic.id, currentRevisionNumber: 1, completedRevisionNumber: 1, submissionState: 'COMPLETE' } });
    await prisma.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'COMPLETE', birthDate: new Date('1990-01-01T00:00:00Z'), sexAtBirth: 'FEMALE', allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, completedAt: new Date(), completedConsentRecordId: consent.id, mutationOperation: 'COMPLETE', mutationKey: randomUUID(), recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: randomUUID().replaceAll('-', '').repeat(2) } });
    sessionId = randomUUID();
    await prisma.session.create({ data: { id: sessionId, userId, refreshTokenHash: randomUUID().replaceAll('-', '').repeat(2), expiresAt: new Date(Date.now() + 2 * 60 * 60_000) } });
    await rotatePatientToken();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    if (adminClient) { await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined); await adminClient.end().catch(() => undefined); }
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('holds the approved mixed authenticated profile for 30 minutes with p95 <= 750ms and >= 99% success', async () => {
    const requestPaths = ['/v1/me', '/v1/patients/me/onboarding-status', '/v1/assessments', '/v1/patients/me/booking-eligibility', '/v1/directory/doctors?page=1&pageSize=10', '/v1/patients/me/clinical/timeline', '/v1/patients/me/clinical/history', '/v1/appointments?page=1&pageSize=10'] as const;
    const routeStatuses = new Map<string, Map<number, number>>();
    const durations: number[] = []; let successes = 0; let total = 0;
    for (let second = 0; second < runDurationSeconds; second += 1) {
      // The JWT's actual exp claim drives rotation; the short safety margin absorbs
      // loop/setup drift without changing the approved request rate or duration.
      await rotateBeforeExpiry();
      const began = performance.now();
      const responses = await Promise.all(Array.from({ length: MIXED_REQUESTS_PER_SECOND }, async (_, index) => {
        const path = requestPaths[(second * MIXED_REQUESTS_PER_SECOND + index) % requestPaths.length]!;
        const started = performance.now(); const response = await app.inject({ method: 'GET', url: path, headers: headers() });
        const statuses = routeStatuses.get(path) ?? new Map<number, number>(); statuses.set(response.statusCode, (statuses.get(response.statusCode) ?? 0) + 1); routeStatuses.set(path, statuses);
        durations.push(performance.now() - started); return response;
      }));
      total += responses.length; successes += responses.filter((response) => response.statusCode >= 200 && response.statusCode < 300).length;
      const remaining = 1_000 - (performance.now() - began); if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    const p95 = [...durations].sort((left, right) => left - right)[Math.ceil(durations.length * 0.95) - 1]!;
    const routeStatusObject = Object.fromEntries([...routeStatuses].map(([path, statuses]) => [path, Object.fromEntries(statuses)]));
    const clinicalAuditCount = await prisma.patientAccessAudit.count({ where: { patientId, actorSessionId: sessionId } });
    const allRoutesAreSuccessful = requestPaths.every((path) => [...(routeStatuses.get(path)?.keys() ?? [])].every((status) => status >= 200 && status < 300));
    // Explicitly prove that a freshly rotated token, including the one used by the
    // post-profile booking check, is bound to the persisted fixture session.
    const preRotationToken = token;
    const preRotationExpiry = tokenExpiresAtMs;
    if (isPreflight) tokenExpiresAtMs = Date.now() + TOKEN_ROTATION_SAFETY_MARGIN_MS - 1;
    const postProfilePrincipal = await rotateBeforeExpiry() ?? await rotatePatientToken();
    console.info(JSON.stringify({ task: 'F12-T03', profile: 'mixed-authenticated', mode: isPreflight ? 'preflight' : 'acceptance', durationSeconds: runDurationSeconds, total, successes, successRate: successes / total, p95Ms: p95, routeStatuses: routeStatusObject, clinicalAuditCount, postProfileTokenSessionId: postProfilePrincipal.sessionId }));
    expect(total).toBe(MIXED_REQUESTS_PER_SECOND * runDurationSeconds);
    if (isPreflight) {
      expect(allRoutesAreSuccessful).toBe(true);
      expect(clinicalAuditCount).toBeGreaterThan(0);
      expect(token).not.toBe(preRotationToken);
      expect(tokenExpiresAtMs).toBeGreaterThan(preRotationExpiry);
    }
    expect(postProfilePrincipal.sessionId).toBe(sessionId);
    expect(successes / total).toBeGreaterThanOrEqual(MIXED_MINIMUM_SUCCESS_RATE);
    expect(p95).toBeLessThanOrEqual(MIXED_P95_LIMIT_MS);
  }, 2_000_000);

  it('submits the approved two booking requests in one second against one slot without duplicate allocation', async () => {
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { isActive: true, publicationStatus: 'PUBLISHED' } });
    const rule = await prisma.availabilityRule.findFirstOrThrow({ where: { clinicId: offering.clinicId, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true } });
    const day = nextWeekday(rule.isoWeekday);
    const availability = await app.inject({ method: 'GET', url: `/v1/directory/doctor-services/${offering.id}/availability?fromDate=${day}&toDate=${day}&pageSize=100`, headers: headers() });
    expect(availability.statusCode).toBe(200); const startsAt = availability.json().items[0]?.startsAt as string | undefined; expect(startsAt).toBeTruthy();
    const began = performance.now();
    const results = await Promise.all(Array.from({ length: BOOKING_REQUESTS_PER_SECOND }, (_, index) => app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(`phase-12-booking-${index}`), payload: { doctorServiceId: offering.id, startsAt } })));
    expect(performance.now() - began).toBeLessThanOrEqual(1_000);
    expect(results.filter((result) => result.statusCode === 201)).toHaveLength(1);
    expect(results.filter((result) => result.statusCode === 409 && result.json().code === 'APPOINTMENT_SLOT_CONFLICT')).toHaveLength(1);
    expect(await prisma.appointment.count({ where: { patientId, doctorId: offering.doctorId, startsAt: new Date(startsAt!) } })).toBe(1);
  }, 30_000);
});
