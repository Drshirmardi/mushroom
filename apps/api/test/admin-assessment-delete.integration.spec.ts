import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';
import { createReleaseAdminTestPrincipal, type ReleaseAdminTestPrincipal } from './release-admin-test-support';

// Fixture history is retained; this suite may run only in the explicitly disposable local database.
describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('admin draft and archived deletion (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication; let db: PrismaService; let admin: ReleaseAdminTestPrincipal;
  let clinicId: string; let patient: Awaited<ReturnType<typeof createTestAccessToken>>;
  beforeAll(async () => {
    assertPatientJourneyTestDatabase(); app = await createApiApplication(); await app.init();
    db = app.get(PrismaService); const tokens = app.get(AccessTokenService);
    admin = await createReleaseAdminTestPrincipal(db, tokens);
    patient = await createTestAccessToken(db, tokens, ['PATIENT']);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  const headers = (token = admin.token) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000' });
  async function fixture() {
    const response = await app.inject({ method: 'POST', url: '/v1/admin/assessments', headers: headers(), payload: {
      assessmentKey: `DELETE_${randomUUID().replaceAll('-', '')}`, title: 'Synthetic delete fixture',
      structure: { schemaVersion: 1, sections: [{ id: 'section', questions: [{ id: 'question', type: 'BOOLEAN', required: true, trueScore: 1, falseScore: 0 }] }] },
    } });
    expect(response.statusCode).toBe(201);
    return response.json<{ id: string; contentHash: string }>();
  }
  const remove = (version: { id: string; contentHash: string }, token = admin.token) => app.inject({ method: 'DELETE', url: `/v1/admin/assessments/${version.id}?expectedContentHash=${version.contentHash}`, headers: headers(token) });

  it('requires ADMIN, deletes only the exact draft and retains the audit record', async () => {
    const version = await fixture();
    expect((await remove(version, patient.token)).statusCode).toBe(403);
    const stale = await remove({ ...version, contentHash: '0'.repeat(64) });
    expect(stale.statusCode).toBe(409); expect(stale.json().code).toBe('ASSESSMENT_DELETE_CONFLICT');
    expect(await db.assessmentVersion.findUnique({ where: { id: version.id } })).not.toBeNull();
    const deleted = await remove(version);
    expect(deleted.statusCode).toBe(200); expect(deleted.json()).toEqual({ id: version.id });
    expect(await db.assessmentVersion.findUnique({ where: { id: version.id } })).toBeNull();
    expect(await db.auditEvent.count({ where: { action: 'ASSESSMENT_VERSION_DELETED', subjectId: version.id, actorUserId: admin.userId } })).toBe(1);
    expect((await remove(version)).statusCode).toBe(404);
  });
  it('preserves published history and any referenced draft', async () => {
    const published = await fixture();
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${published.id}/publish`, headers: headers() })).statusCode).toBe(200);
    const denied = await remove(published);
    expect(denied.statusCode).toBe(409); expect(denied.json().code).toBe('ASSESSMENT_DELETE_NOT_ALLOWED');
    expect(await db.assessmentVersion.findUnique({ where: { id: published.id } })).not.toBeNull();
    const referenced = await fixture();
    const profile = await db.patientProfile.create({ data: { clinicId, userId: patient.userId } });
    const submission = await db.patientAssessmentSubmission.create({ data: { patientId: profile.id, assessmentVersionId: referenced.id } });
    const blocked = await remove(referenced);
    expect(blocked.statusCode).toBe(409); expect(blocked.json().code).toBe('ASSESSMENT_DELETE_REFERENCED');
    expect(await db.patientAssessmentSubmission.findUnique({ where: { id: submission.id } })).not.toBeNull();
    expect(await db.assessmentVersion.findUnique({ where: { id: referenced.id } })).not.toBeNull();
    expect(await db.auditEvent.count({ where: { action: 'ASSESSMENT_VERSION_DELETED', subjectId: referenced.id } })).toBe(0);
  });
  it('scopes deletion to the active clinic and validates the expected hash', async () => {
    const version = await fixture();
    const invalid = await app.inject({ method: 'DELETE', url: `/v1/admin/assessments/${version.id}?expectedContentHash=invalid`, headers: headers() });
    expect(invalid.statusCode).toBe(400);
    const otherClinic = await db.clinic.create({ data: { name: 'Synthetic inactive clinic', status: 'INACTIVE' } });
    const foreign = await db.assessmentVersion.create({ data: { clinicId: otherClinic.id, assessmentKey: 'OTHER', title: 'Synthetic foreign draft', versionNumber: 1, contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [] } } });
    expect((await remove(foreign)).statusCode).toBe(404);
    expect(await db.assessmentVersion.findUnique({ where: { id: foreign.id } })).not.toBeNull();
  });
  it('deletes an unreferenced archived version and records its archived status', async () => {
    const version = await fixture();
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${version.id}/publish`, headers: headers() })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${version.id}/archive`, headers: headers() })).statusCode).toBe(200);
    expect((await remove(version, patient.token)).statusCode).toBe(403);
    const stale = await remove({ ...version, contentHash: '0'.repeat(64) });
    expect(stale.statusCode).toBe(409); expect(stale.json().code).toBe('ASSESSMENT_DELETE_CONFLICT');
    const deleted = await remove(version);
    expect(deleted.statusCode).toBe(200);
    expect(await db.assessmentVersion.findUnique({ where: { id: version.id } })).toBeNull();
    const audit = await db.auditEvent.findFirstOrThrow({ where: { action: 'ASSESSMENT_VERSION_DELETED', subjectId: version.id } });
    expect(audit.metadata).toMatchObject({ status: 'RETIRED', contentHash: version.contentHash });
  });
  it('keeps retired update immutability and blocks deletion when an archived version has a submission', async () => {
    const version = await fixture();
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${version.id}/publish`, headers: headers() })).statusCode).toBe(200);
    const actor = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const profile = await db.patientProfile.create({ data: { clinicId, userId: actor.userId } });
    const submission = await db.patientAssessmentSubmission.create({ data: { patientId: profile.id, assessmentVersionId: version.id } });
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${version.id}/archive`, headers: headers() })).statusCode).toBe(200);
    await expect(db.assessmentVersion.update({ where: { id: version.id }, data: { title: 'Mutation must still fail' } })).rejects.toThrow();
    const blocked = await remove(version);
    expect(blocked.statusCode).toBe(409); expect(blocked.json().code).toBe('ASSESSMENT_DELETE_REFERENCED');
    expect(await db.assessmentVersion.findUnique({ where: { id: version.id } })).not.toBeNull();
    expect(await db.patientAssessmentSubmission.findUnique({ where: { id: submission.id } })).not.toBeNull();
    expect(await db.auditEvent.count({ where: { action: 'ASSESSMENT_VERSION_DELETED', subjectId: version.id } })).toBe(0);
  });
});
