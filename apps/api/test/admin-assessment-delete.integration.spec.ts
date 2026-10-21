import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { assertPatientJourneyTestDatabase, createTestAccessToken } from './auth-test-support';
import { createReleaseAdminTestPrincipal, type ReleaseAdminTestPrincipal } from './release-admin-test-support';

// Fixture history is retained; this suite may run only in the explicitly disposable local database.
describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('admin deletion with retained results (isolated PostgreSQL)', () => {
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

  it('requires ADMIN and the exact hash, retains source and hides deletion from management', async () => {
    const version = await fixture();
    expect((await remove(version, patient.token)).statusCode).toBe(403);
    expect((await remove({ ...version, contentHash: '0'.repeat(64) })).json().code).toBe('ASSESSMENT_DELETE_CONFLICT');
    expect((await remove(version)).statusCode).toBe(200);
    expect(await db.assessmentVersion.findUnique({ where: { id: version.id } })).toMatchObject({ status: 'DELETED', contentHash: version.contentHash });
    expect((await remove(version)).statusCode).toBe(200);
    expect(await db.auditEvent.count({ where: { action: 'ASSESSMENT_VERSION_DELETED', subjectId: version.id } })).toBe(1);
    expect((await app.inject({ method: 'GET', url: `/v1/admin/assessments/${version.id}`, headers: headers() })).statusCode).toBe(404);
    const list = await app.inject({ method: 'GET', url: '/v1/admin/assessments?pageSize=50', headers: headers() });
    expect(list.json().items.some((item: { id: string }) => item.id === version.id)).toBe(false);
    await expect(db.assessmentVersion.update({ where: { id: version.id }, data: { status: 'DRAFT' } })).rejects.toThrow();
    await expect(db.assessmentVersion.delete({ where: { id: version.id } })).rejects.toThrow();
  });
  it('deletes a published assessment while keeping the exact owned result, history and questionnaire', async () => {
    const version = await fixture();
    const profile = await db.patientProfile.upsert({ where: { userId: patient.userId }, create: { clinicId, userId: patient.userId }, update: {} });
    expect((await app.inject({ method: 'POST', url: `/v1/admin/assessments/${version.id}/publish`, headers: headers() })).statusCode).toBe(201);
    const start = await app.inject({ method: 'POST', url: `/v1/assessments/${version.id}/submissions`, headers: headers(patient.token) });
    expect(start.statusCode).toBe(201); const attempt = start.json();
    const saved = await app.inject({ method: 'PUT', url: `/v1/assessment-submissions/${attempt.id}`, headers: headers(patient.token), payload: { answers: { question: true }, expectedRevision: attempt.revision } });
    expect(saved.statusCode).toBe(200);
    const completed = await app.inject({ method: 'POST', url: `/v1/assessment-submissions/${attempt.id}/submit`, headers: { ...headers(patient.token), 'idempotency-key': randomUUID() }, payload: { expectedRevision: saved.json().revision } });
    expect(completed.statusCode).toBe(201);
    const before = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } });
    expect((await remove(version)).statusCode).toBe(200);
    expect(await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: attempt.id } })).toEqual(before);
    const result = await app.inject({ method: 'GET', url: `/v1/assessment-submissions/${attempt.id}/result`, headers: headers(patient.token) });
    expect(result.statusCode).toBe(200); expect(result.json().resultSnapshot).toEqual(completed.json().resultSnapshot);
    const questionnaire = await app.inject({ method: 'GET', url: `/v1/assessment-submissions/${attempt.id}/questionnaire`, headers: headers(patient.token) });
    expect(questionnaire.statusCode).toBe(200); expect(questionnaire.json()).toMatchObject({ status: 'DELETED', resumeAvailable: false });
    const history = await app.inject({ method: 'GET', url: '/v1/patients/me/assessment-submissions', headers: headers(patient.token) });
    expect(history.statusCode).toBe(200); expect(history.json().items.some((item: { id: string }) => item.id === attempt.id)).toBe(true);
    expect((await app.inject({ method: 'POST', url: `/v1/assessments/${version.id}/submissions`, headers: headers(patient.token) })).statusCode).toBe(404);
    expect(await db.patientProfile.findUnique({ where: { id: profile.id } })).not.toBeNull();
  });
  it('keeps clinic scope and rejects stale or malformed deletion commands', async () => {
    const version = await fixture();
    const invalid = await app.inject({ method: 'DELETE', url: `/v1/admin/assessments/${version.id}?expectedContentHash=invalid`, headers: headers() }); expect(invalid.statusCode).toBe(400);
    const otherClinic = await db.clinic.create({ data: { name: 'Synthetic inactive clinic', status: 'INACTIVE' } });
    const foreign = await db.assessmentVersion.create({ data: { clinicId: otherClinic.id, assessmentKey: 'OTHER', title: 'Synthetic foreign draft', versionNumber: 1, contentHash: 'a'.repeat(64), structure: { schemaVersion: 1, sections: [] } } });
    expect((await remove(foreign)).statusCode).toBe(404);
    expect(await db.assessmentVersion.findUnique({ where: { id: foreign.id } })).toMatchObject({ status: 'DRAFT' });
  });
});
