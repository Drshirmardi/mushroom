import { createCompleteTestPatient } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment discovery (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let clinicId: string;
  type Actor = Awaited<ReturnType<typeof patient>>;
  const structure = { schemaVersion: 1, sections: [{ id: 's', title: 'Synthetic section', order: 1, questions: [{ id: 'q', title: 'Synthetic question', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 }] }], resultBands: [{ id: 'only', title: 'Synthetic band', minInclusive: 0, requiresReview: false }] };
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test required.');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  async function patient() {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const role = await db.role.findUniqueOrThrow({ where: { code: 'PATIENT' } });
    await db.userRole.create({ data: { userId: auth.userId, roleId: role.id } });
    const profile = await createCompleteTestPatient(db, { data: { userId: auth.userId, clinicId } });
    return { ...auth, patientId: profile.id };
  }
  const request = (p: { token: string }, method: 'GET' | 'POST' | 'PUT', path: string, payload?: object) => app.inject({ method, url: `/v1/${path}`, headers: { authorization: `Bearer ${p.token}`, origin: 'http://localhost:3000', 'idempotency-key': randomUUID(), ...(payload ? { 'content-type': 'application/json' } : {}) }, ...(payload ? { payload: JSON.stringify(payload) } : {}) });
  const get = (p: { token: string }, path = 'patients/me/assessment-submissions') => request(p, 'GET', path);
  async function attempt(p: Actor, status: 'DRAFT' | 'PUBLISHED' | 'RETIRED' = 'PUBLISHED', otherClinic = clinicId) {
    const version = await db.assessmentVersion.create({ data: { clinicId: otherClinic, assessmentKey: 'MEZAJ', locale: `x-${randomUUID().slice(0, 8)}`, versionNumber: 1, title: 'Synthetic questionnaire', structure, contentHash: 'a'.repeat(64), status,
      ...(status !== 'DRAFT' ? { publishedAt: new Date() } : {}), ...(status === 'RETIRED' ? { retiredAt: new Date() } : {}) } });
    const submission = await db.patientAssessmentSubmission.create({ data: { patientId: p.patientId, assessmentVersionId: version.id, answers: { q: true } } });
    return { submission, version };
  }

  it('paginates self summaries with stable boundaries and no answer/result values', async () => {
    const p = await patient(); for (let n = 0; n < 3; n++) await attempt(p);
    const first = await get(p, 'patients/me/assessment-submissions?page=1&pageSize=2');
    const second = await get(p, 'patients/me/assessment-submissions?page=2&pageSize=2');
    expect(first.statusCode).toBe(200); expect(first.headers['cache-control']).toBe('private, no-store');
    expect(first.json()).toMatchObject({ page: 1, pageSize: 2, total: 3 }); expect(first.json().items).toHaveLength(2); expect(second.json().items).toHaveLength(1);
    expect(new Set([...first.json().items, ...second.json().items].map(x => x.id)).size).toBe(3);
    for (const field of ['answers', 'resultSnapshot', 'score', 'completionPayloadHash']) expect(first.body).not.toContain(`"${field}"`);
  });
  it('rejects invalid/unknown history query parameters', async () => {
    const p = await patient();
    for (const query of ['page=0', 'page=10001', 'pageSize=51', 'pageSize=0', 'page=1.5', 'state=PAID', 'patientId=someone', 'page=NaN']) expect((await get(p, `patients/me/assessment-submissions?${query}`)).statusCode).toBe(400);
  });
  it('filters history state and does not promise resume for invalidated/draft sources', async () => {
    const p = await patient(); const normal = await attempt(p); const invalid = await attempt(p); await attempt(p, 'DRAFT');
    await db.patientAssessmentSubmission.update({ where: { id: invalid.submission.id }, data: { state: 'INVALIDATED', invalidatedAt: new Date() } });
    const filtered = await get(p, 'patients/me/assessment-submissions?state=INVALIDATED'); expect(filtered.json().total).toBe(1); expect(filtered.json().items[0]).toMatchObject({ id: invalid.submission.id, resumeAvailable: false });
    const all = (await get(p)).json().items as { id: string; resumeAvailable: boolean }[]; expect(all.find(x => x.id === normal.submission.id)?.resumeAvailable).toBe(true); expect(all.filter(x => x.resumeAvailable)).toHaveLength(1);
  });
  it('retrieves the pinned retired questionnaire and continues the same saved draft', async () => {
    const p = await patient(); const { submission, version } = await attempt(p);
    await db.assessmentVersion.update({ where: { id: version.id }, data: { status: 'RETIRED', retiredAt: new Date() } });
    const response = await get(p, `assessment-submissions/${submission.id}/questionnaire`);
    expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ submissionId: submission.id, assessmentVersionId: version.id, contentHash: version.contentHash, status: 'RETIRED', resumeAvailable: true, structure });
    expect((await request(p, 'POST', `assessments/${version.id}/submissions`)).statusCode).toBe(404);
    expect((await request(p, 'PUT', `assessment-submissions/${submission.id}`, { expectedRevision: 0, answers: { q: false } })).statusCode).toBe(200);
    expect((await request(p, 'POST', `assessment-submissions/${submission.id}/submit`, { expectedRevision: 1 })).statusCode).toBe(201);
  });
  it('conceals foreign patient, foreign clinic, draft and invalidated questionnaire targets', async () => {
    const p = await patient(); const other = await patient(); const foreign = await attempt(other); const draft = await attempt(p, 'DRAFT');
    const invalid = await attempt(p); await db.patientAssessmentSubmission.update({ where: { id: invalid.submission.id }, data: { state: 'INVALIDATED', invalidatedAt: new Date() } });
    const clinic = await db.clinic.create({ data: { name: 'Synthetic other', status: 'INACTIVE' } }); const cross = await attempt(p, 'PUBLISHED', clinic.id);
    for (const item of [foreign, draft, invalid, cross]) expect((await get(p, `assessment-submissions/${item.submission.id}/questionnaire`)).statusCode).toBe(404);
    expect((await get(p)).body).not.toContain(cross.submission.id);
  });
  it('persists technical identity for new completions and does not expose answers in provenance', async () => {
    const p = await patient(); const { submission, version } = await attempt(p);
    const completed = await request(p, 'POST', `assessment-submissions/${submission.id}/submit`, { expectedRevision: 0 }); expect(completed.statusCode).toBe(201);
    expect(completed.json().resultSnapshot).toMatchObject({ algorithmId: 'WEIGHTED_SUM', algorithmVersion: 1, questionnaireContentHash: version.contentHash });
    const response = await get(p, `assessment-submissions/${submission.id}/provenance`); expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ provenanceStatus: 'RECORDED', algorithmId: 'WEIGHTED_SUM', algorithmVersion: 1, questionnaireContentHash: version.contentHash, answerPayloadHash: completed.json().resultSnapshot.answerPayloadHash });
    for (const field of ['answers', 'score', 'resultBand', 'resultSnapshot']) expect(response.body).not.toContain(`"${field}"`);
    expect((await get(p, `assessment-submissions/${submission.id}/questionnaire`)).json().resumeAvailable).toBe(false);
  });
  it('reports missing legacy algorithm metadata without rewriting old immutable results', async () => {
    const p = await patient(); const { version } = await attempt(p);
    const snapshot = { snapshotVersion: 1, score: 2, answers: { q: true }, resultBand: null };
    const legacy = await db.patientAssessmentSubmission.create({ data: { patientId: p.patientId, assessmentVersionId: version.id, attemptNumber: 2, state: 'COMPLETE', completedAt: new Date(), answers: { q: true }, score: 2, resultSnapshot: snapshot, completionIdempotencyKey: randomUUID(), completionPayloadHash: 'b'.repeat(64) } });
    const response = await get(p, `assessment-submissions/${legacy.id}/provenance`); expect(response.json()).toMatchObject({ provenanceStatus: 'LEGACY_UNRECORDED', algorithmId: null, algorithmVersion: null, answerPayloadHash: null });
    expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: legacy.id } })).resultSnapshot).toEqual(snapshot);
  });
  it('never returns incomplete/invalidated/foreign provenance', async () => {
    const p = await patient(); const item = await attempt(p); const other = await patient();
    expect((await get(p, `assessment-submissions/${item.submission.id}/provenance`)).statusCode).toBe(404);
    await request(p, 'POST', `assessment-submissions/${item.submission.id}/submit`, { expectedRevision: 0 });
    expect((await get(other, `assessment-submissions/${item.submission.id}/provenance`)).statusCode).toBe(404);
    await db.patientAssessmentSubmission.update({ where: { id: item.submission.id }, data: { state: 'INVALIDATED', invalidatedAt: new Date() } });
    expect((await get(p, `assessment-submissions/${item.submission.id}/provenance`)).statusCode).toBe(404);
  });
  it('enforces patient role and active session on new endpoints', async () => {
    const p = await patient(); const item = await attempt(p); const admin = await createTestAccessToken(db, app.get(AccessTokenService), ['ADMIN']);
    for (const path of ['patients/me/assessment-submissions', `assessment-submissions/${item.submission.id}/questionnaire`, `assessment-submissions/${item.submission.id}/provenance`]) {
      expect((await get(admin, path)).statusCode).toBe(403);
      expect((await app.inject({ method: 'GET', url: `/v1/${path}` })).statusCode).toBe(401);
    }
    await db.session.update({ where: { id: p.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } }); expect((await get(p)).statusCode).toBe(401);
  });
  it('fails closed on audit failure for every new sensitive read', async () => {
    const p = await patient(); const item = await attempt(p); await request(p, 'POST', `assessment-submissions/${item.submission.id}/submit`, { expectedRevision: 0 });
    if (!/^[a-f0-9-]{36}$/.test(p.userId)) throw new Error('Invalid synthetic UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION discovery_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${p.userId}'::uuid THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER discovery_test_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION discovery_test_audit_fail()`);
    try {
      for (const path of ['patients/me/assessment-submissions', `assessment-submissions/${item.submission.id}/questionnaire`, `assessment-submissions/${item.submission.id}/provenance`]) { const response = await get(p, path); expect(response.statusCode).toBe(500); expect(response.body).not.toContain('Synthetic questionnaire'); expect(response.body).not.toContain('synthetic audit failure'); }
    } finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER discovery_test_audit_fail ON audit_events`); await db.$executeRaw(Prisma.sql`DROP FUNCTION discovery_test_audit_fail()`); }
  });
});
