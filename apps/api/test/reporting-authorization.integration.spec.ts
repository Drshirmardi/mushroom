import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AccessTokenService } from '../src/common/auth/access-token.service';
import type { PrismaService } from '../src/database/prisma/prisma.service';

const sourceDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `sabz_zendegi_reporting_authorization_${randomUUID().replaceAll('-', '')}`;
const testAccessSecret = 'f11t09_access_secret_for_disposable_integration_tests_123';
const testRefreshPepper = 'f11t09_refresh_pepper_for_disposable_integration_tests_456';
const apiRoot = basename(process.cwd()) === 'api' && basename(dirname(process.cwd())) === 'apps'
  ? process.cwd()
  : resolve(process.cwd(), 'apps/api');
let adminClient: Client | undefined;
let app: NestFastifyApplication | undefined;
let prisma: PrismaService;
let tokens: AccessTokenService;
let clinicId: string;
let otherClinicId: string;
let foreignPatientId: string;
let activeAdminToken: string;
let patientToken: string;
let doctorToken: string;
let staffToken: string;
let disabledAdminToken: string;
let revokedAdminToken: string;

const databaseUrl = () => {
  if (!sourceDatabaseUrl) {
    throw new Error('DATABASE_URL is required for reporting authorization integration tests.');
  }

  const url = new URL(sourceDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const phone = () => `+989${Math.floor(100_000_000 + Math.random() * 900_000_000)}`;

describe('F11-T09 reporting and access authorization matrix (disposable PostgreSQL)', () => {
  beforeAll(async () => {
    if (!sourceDatabaseUrl) {
      throw new Error('DATABASE_URL is required for reporting authorization integration tests.');
    }

    process.env.JWT_ACCESS_SECRET ??= testAccessSecret;
    process.env.REFRESH_TOKEN_PEPPER ??= testRefreshPepper;

    const adminUrl = new URL(sourceDatabaseUrl);
    adminUrl.pathname = '/postgres';
    adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    const environment = {
      ...process.env,
      DATABASE_URL: databaseUrl(),
      DEV_DASHBOARD_ADMIN_PHONE: '',
      DEV_DASHBOARD_ADMIN_PASSWORD: '',
    };
    const prismaCli = resolve(apiRoot, 'node_modules/prisma/build/index.js');
    const migration = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'],
      { cwd: apiRoot, env: environment, encoding: 'utf8' },
    );
    expect(migration.status, migration.stderr).toBe(0);
    const seed = spawnSync(process.execPath, ['prisma/seed.mjs'], {
      cwd: apiRoot,
      env: environment,
      encoding: 'utf8',
    });
    expect(seed.status, seed.stderr).toBe(0);

    process.env.DATABASE_URL = databaseUrl();
    const { createApiApplication } = await import('../src/app.factory.js');
    const { PrismaService } = await import('../src/database/prisma/prisma.service.js');
    const { AccessTokenService } = await import('../src/common/auth/access-token.service.js');
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(AccessTokenService);
    clinicId = (await prisma.clinic.findFirstOrThrow({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })).id;
    otherClinicId = (await prisma.clinic.create({
      data: { name: `Other reporting scope ${randomUUID()}`, timeZone: 'Asia/Tehran', status: 'INACTIVE' },
    })).id;

    const actor = async (
      roles: string[],
      status: 'ACTIVE' | 'DISABLED' = 'ACTIVE',
      revoked = false,
    ) => {
      const user = await prisma.user.create({
        data: {
          phone: phone(),
          status,
          userProfile: { create: { firstName: 'Authorization', lastName: 'Fixture' } },
        },
      });
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''),
          expiresAt: new Date(Date.now() + 3_600_000),
          ...(revoked ? { revokedAt: new Date(), revokedReason: 'ADMIN_REVOKED' } : {}),
        },
      });
      return tokens.issue({ userId: user.id, sessionId: session.id, roles });
    };

    activeAdminToken = await actor(['ADMIN']);
    patientToken = await actor(['PATIENT']);
    doctorToken = await actor(['DOCTOR']);
    staffToken = await actor(['STAFF']);
    disabledAdminToken = await actor(['ADMIN'], 'DISABLED');
    revokedAdminToken = await actor(['ADMIN'], 'ACTIVE', true);

    const foreignPatient = await prisma.user.create({
      data: {
        phone: phone(),
        userProfile: { create: { firstName: 'Foreign', lastName: 'Patient' } },
        patientProfile: { create: { clinicId: otherClinicId } },
      },
      include: { patientProfile: true },
    });
    foreignPatientId = foreignPatient.patientProfile!.id;
    await prisma.patientAccessAudit.create({
      data: {
        clinicId: otherClinicId,
        patientId: foreignPatientId,
        action: 'READ',
        resourceType: 'ClinicalNote',
        resourceId: randomUUID(),
        metadata: { clinicalText: 'phase-11-private-medical-text' },
      },
    });
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    process.env.DATABASE_URL = sourceDatabaseUrl;
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      await adminClient.end().catch(() => undefined);
    }
  });

  it('allows an active ADMIN only the active clinic-scoped report and redacted audit views', async () => {
    const currentScope = `?clinicId=${clinicId}&from=2026-09-22&to=2026-09-22`;
    const routes = [
      `/v1/admin/reporting/appointments${currentScope}`,
      `/v1/admin/reporting/patients${currentScope}`,
      `/v1/admin/reporting/assessments${currentScope}`,
      `/v1/admin/reporting/treatments${currentScope}`,
      `/v1/admin/commerce/revenue${currentScope}&granularity=DAY`,
      `/v1/admin/audit-events${currentScope}`,
    ];

    for (const url of routes) {
      const response = await app!.inject({ method: 'GET', url, headers: auth(activeAdminToken) });
      expect(response.statusCode, url).toBe(200);
      expect(response.json()).toMatchObject({ clinicId });
      expect(response.body).not.toContain('phase-11-private-medical-text');
    }

    const otherClinicAudit = await app!.inject({
      method: 'GET',
      url: `/v1/admin/audit-events?clinicId=${otherClinicId}&from=2026-09-22&to=2026-09-22`,
      headers: auth(activeAdminToken),
    });
    expect(otherClinicAudit.statusCode).toBe(404);
    expect(otherClinicAudit.body).not.toContain('phase-11-private-medical-text');

    const otherClinicReport = await app!.inject({
      method: 'GET',
      url: `/v1/admin/reporting/patients?clinicId=${otherClinicId}`,
      headers: auth(activeAdminToken),
    });
    expect(otherClinicReport.statusCode).toBe(400);
    expect(otherClinicReport.body).not.toContain('phase-11-private-medical-text');
  });

  it('denies PATIENT, DOCTOR, and STAFF before report, revenue, audit, or export disclosure', async () => {
    const protectedRoutes = [
      `/v1/admin/reporting/appointments?clinicId=${clinicId}`,
      `/v1/admin/reporting/patients?clinicId=${clinicId}`,
      `/v1/admin/reporting/assessments?clinicId=${clinicId}`,
      `/v1/admin/reporting/treatments?clinicId=${clinicId}`,
      `/v1/admin/commerce/revenue?clinicId=${clinicId}`,
      `/v1/admin/audit-events?clinicId=${clinicId}`,
      `/v1/admin/reporting/appointments/export?clinicId=${clinicId}`,
      `/v1/admin/audit-events/export?clinicId=${clinicId}`,
    ];

    for (const token of [patientToken, doctorToken, staffToken]) {
      for (const url of protectedRoutes) {
        const response = await app!.inject({ method: 'GET', url, headers: auth(token) });
        expect(response.statusCode, url).toBe(url.includes('/export') ? 404 : 403);
        expect(response.body).not.toContain('phase-11-private-medical-text');
        expect(response.body).not.toContain(otherClinicId);
      }
    }
  });

  it('denies disabled and revoked ADMIN sessions before any protected disclosure', async () => {
    const protectedRoutes = [
      `/v1/admin/reporting/patients?clinicId=${clinicId}`,
      `/v1/admin/commerce/revenue?clinicId=${clinicId}`,
      `/v1/admin/audit-events?clinicId=${clinicId}`,
    ];

    for (const token of [disabledAdminToken, revokedAdminToken]) {
      for (const url of protectedRoutes) {
        const response = await app!.inject({ method: 'GET', url, headers: auth(token) });
        expect(response.statusCode, url).toBe(401);
        expect(response.body).not.toContain('phase-11-private-medical-text');
      }
    }
  });

  it('keeps medical workspace disclosure behind its separate ownership permission even for ADMIN', async () => {
    const response = await app!.inject({
      method: 'GET',
      url: `/v1/admin/patients/${foreignPatientId}/clinical-workspace`,
      headers: auth(activeAdminToken),
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).not.toContain('Foreign');
    expect(response.body).not.toContain('phase-11-private-medical-text');
  });
});
