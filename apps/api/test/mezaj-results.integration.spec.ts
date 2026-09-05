import { randomUUID } from 'node:crypto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Mezaj result API (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let tokens: AccessTokenService;
  const userIds = new Set<string>();
  const versionIds = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(AccessTokenService);
  }, 30_000);

  afterEach(async () => {
    // Completed submissions and published versions are intentionally immutable in PostgreSQL.
    // Every fixture identifier is unique, so retaining this immutable provenance cannot affect a later run.
    userIds.clear();
    versionIds.clear();
  });

  afterAll(async () => { await app.close(); });

  const request = (method: 'GET' | 'POST' | 'PUT', url: string, token: string, payload?: unknown, headers: Record<string, string> = {}) => app.inject({ method, url, headers: { authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });

  it('derives an immutable result from the completed MEZAJ assessment version and exposes only the patient result', async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'PATIENT' } });
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(user.id);
    const patient = await prisma.patientProfile.create({ data: { userId: user.id, clinicId: clinic.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    const version = await prisma.assessmentVersion.create({ data: { clinicId: clinic.id, assessmentKey: 'MEZAJ', locale: `x-${randomUUID().replaceAll('-', '').slice(0, 12)}`, versionNumber: 1_000_000_000 + Math.floor(Math.random() * 1_000_000_000), title: 'مزاج', status: 'PUBLISHED', publishedAt: new Date(), contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'SINGLE_CHOICE', required: true, options: [{ id: 'warm', score: 5 }, { id: 'cold', score: 1 }] }] }], resultBands: [{ id: 'safravi', title: 'صفراوی', minInclusive: 5 }, { id: 'sodavi', title: 'سوداوی', minInclusive: 0, maxExclusive: 5 }] } } });
    versionIds.add(version.id);
    const session = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: randomUUID().replaceAll('-', ''), expiresAt: new Date(Date.now() + 3_600_000) } });
    const token = await tokens.issue({ userId: user.id, sessionId: session.id, roles: ['PATIENT'] });
    const start = await request('POST', `/v1/assessments/${version.id}/submissions`, token);
    expect(start.statusCode).toBe(201);
    const submissionId = start.json().id as string;
    expect((await request('PUT', `/v1/assessment-submissions/${submissionId}`, token, { answers: { q: 'warm' } })).statusCode).toBe(200);
    expect((await request('POST', `/v1/assessment-submissions/${submissionId}/submit`, token, undefined, { 'idempotency-key': 'mezaj-submit' })).statusCode).toBe(201);
    const result = await request('GET', '/v1/patients/me/mezaj', token);
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({ assessmentVersionId: version.id, assessmentSubmissionId: submissionId, resultBand: { id: 'safravi', title: 'صفراوی' } });
    expect(await prisma.mezajResult.count({ where: { patientId: patient.id, assessmentSubmissionId: submissionId } })).toBe(1);
  });
});
