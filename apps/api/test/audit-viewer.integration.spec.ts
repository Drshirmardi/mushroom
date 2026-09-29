import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PatientAccessAction } from '../src/generated/prisma/client';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import type { PrismaService } from '../src/database/prisma/prisma.service';

const sourceDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_audit_viewer_${randomUUID().replaceAll('-', '')}`;
let adminClient: Client | undefined;
let app: NestFastifyApplication | undefined;
let prisma: PrismaService;
let tokens: AccessTokenService;
let clinicId: string;
let foreignClinicId: string;
let admin: { userId: string; sessionId: string; token: string };
let patientToken: string;
let doctorToken: string;
let staffToken: string;
let revokedAdminToken: string;
let disabledAdminToken: string;
let fixtureIds: string[] = [];

const databaseUrl = () => {
  if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for audit-viewer integration tests.');
  const url = new URL(sourceDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const phone = () => `+989${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;

describe('F11-T06 audit viewer (disposable PostgreSQL)', () => {
  beforeAll(async () => {
    if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required for audit-viewer integration tests.');
    const adminUrl = new URL(sourceDatabaseUrl); adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() }); await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    const environment = { ...process.env, DATABASE_URL: databaseUrl(), DEV_DASHBOARD_ADMIN_PHONE: '', DEV_DASHBOARD_ADMIN_PASSWORD: '' };
    const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js');
    const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], { cwd: process.cwd(), env: environment, encoding: 'utf8' });
    expect(seed.status, seed.stderr).toBe(0);

    process.env.DATABASE_URL = databaseUrl();
    const { createApiApplication } = await import('../src/app.factory.js');
    const { PrismaService } = await import('../src/database/prisma/prisma.service.js');
    const { AccessTokenService } = await import('../src/common/auth/access-token.service.js');
    app = await createApiApplication(); await app.init();
    prisma = app.get(PrismaService); tokens = app.get(AccessTokenService);
    clinicId = (await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' }, select: { id: true } })).id;
    foreignClinicId = (await prisma.clinic.create({ data: { name: `Foreign audit ${randomUUID()}`, timeZone: 'Asia/Tehran', status: 'INACTIVE' } })).id;

    const actor = async (roles: string[], status: 'ACTIVE' | 'DISABLED' = 'ACTIVE', revoked = false) => {
      const user = await prisma.user.create({ data: { phone: phone(), status, userProfile: { create: { firstName: 'Audit', lastName: 'Fixture' } } } });
      const session = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''), expiresAt: new Date(Date.now() + 3_600_000), ...(revoked ? { revokedAt: new Date(), revokedReason: 'ADMIN_REVOKED' } : {}) } });
      return { userId: user.id, sessionId: session.id, token: await tokens.issue({ userId: user.id, sessionId: session.id, roles }) };
    };
    admin = await actor(['ADMIN']);
    patientToken = (await actor(['PATIENT'])).token;
    doctorToken = (await actor(['DOCTOR'])).token;
    staffToken = (await actor(['STAFF'])).token;
    revokedAdminToken = (await actor(['ADMIN'], 'ACTIVE', true)).token;
    disabledAdminToken = (await actor(['ADMIN'], 'DISABLED')).token;

    const patient = async (clinic: string) => {
      const user = await prisma.user.create({ data: { phone: phone(), userProfile: { create: { firstName: 'Clinical', lastName: 'Patient' } }, patientProfile: { create: { clinicId: clinic } } }, include: { patientProfile: true } });
      return user.patientProfile!.id;
    };
    const patientId = await patient(clinicId);
    const foreignPatientId = await patient(foreignClinicId);
    const at = ['2026-09-22T10:00:00.000Z', '2026-09-22T09:00:00.000Z', '2026-09-22T08:00:00.000Z'];
    const events = await Promise.all(at.map((createdAt, index) => prisma.patientAccessAudit.create({ data: {
      clinicId, patientId, actorUserId: admin.userId, actorSessionId: admin.sessionId, action: index === 0 ? PatientAccessAction.READ : PatientAccessAction.SIGN,
      resourceType: index === 0 ? 'ClinicalNote' : 'TreatmentPlan', resourceId: randomUUID(), requestId: `request-sensitive-${index}`, correlationId: `correlation-sensitive-${index}`,
      ipAddress: '127.0.0.1', metadata: { clinicalText: 'highly-sensitive-clinical-text', credential: 'never-expose' }, createdAt: new Date(createdAt),
    } })));
    fixtureIds = events.map((event) => event.id);
    await prisma.patientAccessAudit.create({ data: { clinicId: foreignClinicId, patientId: foreignPatientId, action: PatientAccessAction.READ, resourceType: 'ClinicalNote', resourceId: randomUUID(), metadata: { clinicalText: 'foreign-clinic-secret' }, createdAt: new Date('2026-09-22T11:00:00.000Z') } });
  }, 90_000);

  afterAll(async () => {
    await app?.close(); process.env.DATABASE_URL = sourceDatabaseUrl;
    if (adminClient) { await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined); await adminClient.end().catch(() => undefined); }
  });

  it('returns only an explicitly clinic-scoped, redacted, cursor-paginated representation and records sensitive reads', async () => {
    const beforeReads = await prisma.patientAccessAudit.count({ where: { clinicId, resourceType: 'AUDIT_VIEWER_READ' } });
    const response = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}&from=2026-09-22&to=2026-09-22&limit=1`, headers: auth(admin.token) });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ clinicId, timeZone: 'Asia/Tehran', from: '2026-09-22', to: '2026-09-22' });
    expect(body.items).toHaveLength(1); expect(body.items[0]).toMatchObject({ id: fixtureIds[0], action: 'READ', subjectType: 'ClinicalNote', metadataSummary: { source: 'CLINICAL_ACCESS_AUDIT', redaction: 'APPLIED' } });
    expect(body.items[0]).not.toHaveProperty('patientId'); expect(body.items[0]).not.toHaveProperty('actorUserId'); expect(body.items[0]).not.toHaveProperty('resourceId'); expect(body.items[0]).not.toHaveProperty('metadata'); expect(body.items[0]).not.toHaveProperty('ipAddress');
    expect(JSON.stringify(body)).not.toContain('highly-sensitive-clinical-text'); expect(JSON.stringify(body)).not.toContain('foreign-clinic-secret'); expect(body.nextCursor).toEqual(expect.any(String));
    const second = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}&from=2026-09-22&to=2026-09-22&limit=2&cursor=${encodeURIComponent(body.nextCursor)}`, headers: auth(admin.token) });
    expect(second.statusCode).toBe(200); expect(second.json().items.map((item: { id: string }) => item.id)).toEqual(fixtureIds.slice(1));
    expect(await prisma.patientAccessAudit.count({ where: { clinicId, resourceType: 'AUDIT_VIEWER_READ' } })).toBe(beforeReads + 3);
  });

  it('accepts only documented filters, applies them inside the selected clinic scope, and has no export route', async () => {
    const filtered = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}&from=2026-09-22&to=2026-09-22&action=SIGN&subjectType=TreatmentPlan&actorId=${admin.userId}`, headers: auth(admin.token) });
    expect(filtered.statusCode).toBe(200); expect(filtered.json().items.map((item: { id: string }) => item.id)).toEqual(fixtureIds.slice(1));
    const unsupported = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}&export=csv`, headers: auth(admin.token) });
    expect(unsupported.statusCode).toBe(400);
    const oversized = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}&from=2025-01-01&to=2026-09-22`, headers: auth(admin.token) });
    expect(oversized.statusCode).toBe(400);
    const exportRoute = await app!.inject({ method: 'GET', url: '/v1/admin/audit-events/export', headers: auth(admin.token) });
    expect(exportRoute.statusCode).toBe(404);
  });

  it('denies non-admin, revoked, and disabled principals before any audit query or sensitive-read record', async () => {
    const beforeReads = await prisma.patientAccessAudit.count({ where: { clinicId, resourceType: 'AUDIT_VIEWER_READ' } });
    for (const token of [patientToken, doctorToken, staffToken]) {
      const response = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}`, headers: auth(token) });
      expect(response.statusCode).toBe(403);
    }
    for (const token of [revokedAdminToken, disabledAdminToken]) {
      const response = await app!.inject({ method: 'GET', url: `/v1/admin/audit-events?clinicId=${clinicId}`, headers: auth(token) });
      expect(response.statusCode).toBe(401);
    }
    expect(await prisma.patientAccessAudit.count({ where: { clinicId, resourceType: 'AUDIT_VIEWER_READ' } })).toBe(beforeReads);
  });
});
