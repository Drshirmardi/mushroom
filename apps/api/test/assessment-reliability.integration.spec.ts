import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { createTestAccessToken } from './auth-test-support';

// Completed fixtures are immutable; this suite owns only a disposable, explicitly opted-in database.
describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('assessment reliability (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let clinicId: string;
  type Patient = Awaited<ReturnType<typeof fixture>>;

  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') {
      throw new Error('Assessment reliability requires disposable local patient_journey_test.');
    }
    Logger.overrideLogger(false);
    app = await createApiApplication();
    await app.init();
    db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
  }, 30_000);

  afterAll(async () => { await app?.close(); });

  async function fixture(assessmentKey = 'MEZAJ') {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const role = await db.role.findUniqueOrThrow({ where: { code: 'PATIENT' } });
    await db.userRole.create({ data: { userId: auth.userId, roleId: role.id } });
    const patient = await db.patientProfile.create({ data: { userId: auth.userId, clinicId } });
    const version = await db.assessmentVersion.create({ data: {
      clinicId, assessmentKey, versionNumber: 1, locale: `x-${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      title: 'Synthetic assessment', contentHash: 'a'.repeat(64), status: 'PUBLISHED', publishedAt: new Date(),
      structure: { schemaVersion: 1, sections: [{ id: 's', questions: [{ id: 'q', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 }] }], resultBands: [{ id: 'only', title: 'Synthetic band', minInclusive: 0, requiresReview: false }] },
    } });
    return { ...auth, patientId: patient.id, versionId: version.id };
  }

  const request = (actor: Patient, method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown, key = randomUUID()) => app.inject({
    method, url,
    headers: { authorization: `Bearer ${actor.token}`, origin: 'http://localhost:3000', 'idempotency-key': key, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
  });
  const start = (p: Patient) => request(p, 'POST', `/v1/assessments/${p.versionId}/submissions`);
  const save = (p: Patient, id: string, answers: object, revision?: number) => request(p, 'PUT', `/v1/assessment-submissions/${id}`, { answers, ...(revision === undefined ? {} : { expectedRevision: revision }) });
  const submit = (p: Patient, id: string, key = randomUUID(), revision?: number) => request(p, 'POST', `/v1/assessment-submissions/${id}/submit`, revision === undefined ? undefined : { expectedRevision: revision }, key);
  async function answered(p: Patient) {
    const opened = await start(p); expect(opened.statusCode).toBe(201);
    const id = opened.json().id as string;
    expect((await save(p, id, { q: true })).statusCode).toBe(200);
    return id;
  }

  it('concurrent starts return the same single active attempt', async () => {
    const p = await fixture();
    const replies = await Promise.all(Array.from({ length: 12 }, () => start(p)));
    expect(replies.map(r => r.statusCode)).toEqual(Array(12).fill(201));
    expect(new Set(replies.map(r => r.json().id)).size).toBe(1);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId, state: 'IN_PROGRESS' } })).toBe(1);
    expect(await db.auditEvent.count({ where: { actorUserId: p.userId, action: 'PATIENT_ASSESSMENT_SUBMISSION_STARTED' } })).toBe(1);
  });

  it('database rejects a second active attempt even outside the service', async () => {
    const p = await fixture(); await start(p);
    await expect(db.patientAssessmentSubmission.create({ data: { patientId: p.patientId, assessmentVersionId: p.versionId, attemptNumber: 2, answers: {} } })).rejects.toThrow();
  });

  it('concurrent identical submit retries return one completion and one Mezaj result', async () => {
    const p = await fixture(); const id = await answered(p); const key = randomUUID();
    const replies = await Promise.all(Array.from({ length: 12 }, () => submit(p, id, key)));
    expect(replies.map(r => r.statusCode)).toEqual(Array(12).fill(201));
    expect(new Set(replies.map(r => r.json().completedAt)).size).toBe(1);
    expect(await db.mezajResult.count({ where: { assessmentSubmissionId: id } })).toBe(1);
    expect(await db.auditEvent.count({ where: { subjectId: id, action: 'PATIENT_ASSESSMENT_SUBMISSION_COMPLETED' } })).toBe(1);
  });

  it('never replays a completion key onto a different submission with identical answers', async () => {
    const p = await fixture(); const key = randomUUID(); const first = await answered(p);
    expect((await submit(p, first, key)).statusCode).toBe(201);
    const second = await answered(p);
    const response = await submit(p, second, key);
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id: second } })).state).toBe('IN_PROGRESS');
  });

  it('serializes a shared completion key across two distinct in-progress submissions', async () => {
    const p = await fixture(); const other = await fixture('MAIN');
    const first = await answered(p); const second = await answered({ ...p, versionId: other.versionId });
    const key = randomUUID();
    const replies = await Promise.all([submit(p, first, key), submit(p, second, key)]);
    expect(replies.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId, completionIdempotencyKey: key } })).toBe(1);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId, state: 'IN_PROGRESS' } })).toBe(1);
  });

  it('rejects stale changing saves and accepts equal draft retries without advancing revision', async () => {
    const p = await fixture(); const opened = (await start(p)).json();
    expect(opened.revision).toBe(0);
    const saved = await save(p, opened.id, { q: true }, 0);
    expect(saved.statusCode).toBe(200); expect(saved.json().revision).toBe(1);
    const stale = await save(p, opened.id, { q: false }, 0);
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'ASSESSMENT_SUBMISSION_REVISION_CONFLICT', details: { currentRevision: 1 } });
    const replay = await save(p, opened.id, { q: true }, 0);
    expect(replay.statusCode).toBe(200); expect(replay.json().revision).toBe(1);
  });

  it('allows one winner for parallel changing saves against the same revision', async () => {
    const p = await fixture(); const id = (await start(p)).json().id as string;
    const replies = await Promise.all([save(p, id, { q: true }, 0), save(p, id, { q: false }, 0)]);
    expect(replies.map(r => r.statusCode).sort()).toEqual([200, 409]);
  });

  it('returns a conflict for competing completion keys rather than rewriting a completed result', async () => {
    const p = await fixture(); const id = await answered(p);
    const replies = await Promise.all([submit(p, id), submit(p, id)]);
    expect(replies.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(await db.mezajResult.count({ where: { assessmentSubmissionId: id } })).toBe(1);
  });

  it('rejects invalid revision DTOs without changing answers', async () => {
    const p = await fixture(); const id = (await start(p)).json().id as string;
    for (const revision of [null, -1, 0.5, '0', 2147483648]) {
      expect((await request(p, 'PUT', `/v1/assessment-submissions/${id}`, { answers: { q: true }, expectedRevision: revision })).statusCode).toBe(400);
      expect((await request(p, 'POST', `/v1/assessment-submissions/${id}/submit`, { expectedRevision: revision })).statusCode).toBe(400);
    }
    expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } })).answers).toEqual({});
  });

  it('does not allow same-patient submissions tied to another clinic to bypass resource checks', async () => {
    const p = await fixture();
    const other = await db.clinic.create({ data: { name: 'Synthetic inactive clinic', status: 'INACTIVE', timeZone: 'Asia/Tehran' } });
    const version = await db.assessmentVersion.create({ data: {
      clinicId: other.id, assessmentKey: 'MAIN', title: 'Synthetic other clinic', versionNumber: 1,
      structure: {}, contentHash: 'b'.repeat(64), status: 'PUBLISHED', publishedAt: new Date(),
    } });
    expect((await start({ ...p, versionId: version.id })).statusCode).toBe(404);
    const row = await db.patientAssessmentSubmission.create({ data: { patientId: p.patientId, assessmentVersionId: version.id, answers: {} } });
    for (const reply of [
      await request(p, 'GET', `/v1/assessment-submissions/${row.id}`),
      await save(p, row.id, { q: true }), await submit(p, row.id),
    ]) expect(reply.statusCode).toBe(404);
  });

  it('rejects stale submit and permits exact completion replay with the pre-completion revision', async () => {
    const p = await fixture(); const id = await answered(p); const key = randomUUID();
    expect((await submit(p, id, key, 0)).statusCode).toBe(409);
    const completed = await submit(p, id, key, 1);
    expect(completed.statusCode).toBe(201); expect(completed.json().revision).toBe(2);
    const replay = await submit(p, id, key, 1);
    expect(replay.statusCode).toBe(201); expect(replay.json()).toEqual(completed.json());
    expect((await submit(p, id, randomUUID(), 2)).statusCode).toBe(409);
  });

  it('serializes save versus submit without mismatching frozen answers, score or result', async () => {
    const p = await fixture(); const id = await answered(p);
    const [saved, completed] = await Promise.all([save(p, id, { q: false }, 1), submit(p, id, randomUUID(), 1)]);
    // The response pair is either save 200 / submit 409, or save 409 / submit 201.
    expect([[200, 409], [409, 201]]).toContainEqual([saved.statusCode, completed.statusCode]);
    if (completed.statusCode === 409) expect((await submit(p, id)).statusCode).toBe(201);
    const row = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } });
    const snapshot = row.resultSnapshot as { answers: object; score: number };
    expect(snapshot.answers).toEqual(row.answers);
    expect(snapshot.score).toBe((row.answers as { q: boolean }).q ? 2 : 0);
    expect(Number(row.score)).toBe(snapshot.score);
  });

  it('supports the old save and submit wire payloads and preserves MAIN/MEZAJ separation', async () => {
    const p = await fixture('MAIN'); const id = await answered(p);
    expect((await submit(p, id)).statusCode).toBe(201);
    expect(await db.mezajResult.count({ where: { assessmentSubmissionId: id } })).toBe(0);
    expect((await save(p, id, { q: false })).statusCode).toBe(409);
    expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } })).answers).toEqual({ q: true });
  });

  it('conceals another patient submission on get/save/submit/result', async () => {
    const owner = await fixture(); const stranger = await fixture(); const id = await answered(owner);
    for (const reply of [
      await request(stranger, 'GET', `/v1/assessment-submissions/${id}`),
      await save(stranger, id, { q: false }, 0), await submit(stranger, id),
      await request(stranger, 'GET', `/v1/assessment-submissions/${id}/result`),
    ]) expect(reply.statusCode).toBe(404);
  });

  it('does not return latest Mezaj after invalidation of its source', async () => {
    const p = await fixture(); const id = await answered(p); await submit(p, id);
    await db.patientAssessmentSubmission.update({ where: { id }, data: { state: 'INVALIDATED', invalidatedAt: new Date() } });
    expect((await request(p, 'GET', '/v1/patients/me/mezaj')).statusCode).toBe(404);
    expect((await request(p, 'GET', `/v1/assessment-submissions/${id}/result`)).statusCode).toBe(404);
  });

  async function failingAudit<T>(p: Patient, run: () => Promise<T>): Promise<T> {
    // Actor-specific database fault; never affects another fixture or a persistent database.
    expect(p.userId).toMatch(/^[a-f0-9-]{36}$/);
    await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION pj_r01_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${p.userId}'::uuid THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe('CREATE TRIGGER pj_r01_reject_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION pj_r01_reject_audit()');
    try { return await run(); }
    finally {
      await db.$executeRawUnsafe('DROP TRIGGER pj_r01_reject_audit ON audit_events');
      await db.$executeRawUnsafe('DROP FUNCTION pj_r01_reject_audit()');
    }
  }

  it('rolls back a new attempt when its required audit cannot be written', async () => {
    const p = await fixture(); const response = await failingAudit(p, () => start(p));
    expect(response.statusCode).toBe(500);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId } })).toBe(0);
  });

  it('rolls back saved answers and revision when required audit fails', async () => {
    const p = await fixture(); const id = await answered(p);
    const before = await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } });
    expect((await failingAudit(p, () => save(p, id, { q: false }))).statusCode).toBe(500);
    expect(await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } })).toEqual(before);
  });

  it('rolls back completion and Mezaj result when required audit fails', async () => {
    const p = await fixture(); const id = await answered(p);
    expect((await failingAudit(p, () => submit(p, id))).statusCode).toBe(500);
    expect((await db.patientAssessmentSubmission.findUniqueOrThrow({ where: { id } })).state).toBe('IN_PROGRESS');
    expect(await db.mezajResult.count({ where: { assessmentSubmissionId: id } })).toBe(0);
  });

  it('fails closed on sensitive reads and resume when audit is unavailable', async () => {
    const p = await fixture(); const id = await answered(p);
    expect((await failingAudit(p, () => request(p, 'GET', `/v1/assessment-submissions/${id}`))).statusCode).toBe(500);
    expect((await failingAudit(p, () => start(p))).statusCode).toBe(500);
    await submit(p, id);
    expect((await failingAudit(p, () => request(p, 'GET', `/v1/assessment-submissions/${id}/result`))).statusCode).toBe(500);
    expect((await failingAudit(p, () => request(p, 'GET', '/v1/patients/me/mezaj'))).statusCode).toBe(500);
  });

  it('sensitive read audit contains identifiers and no answer or result content', async () => {
    const p = await fixture(); const id = await answered(p);
    expect((await request(p, 'GET', `/v1/assessment-submissions/${id}`)).statusCode).toBe(200);
    const events = await db.auditEvent.findMany({ where: { actorUserId: p.userId, subjectId: id } });
    expect(events.some(e => e.action === 'PATIENT_ASSESSMENT_SUBMISSION_READ')).toBe(true);
    expect(events.every(e => JSON.stringify(e.metadata) === '{}')).toBe(true);
  });

  it('documents optional revision preconditions without removing legacy request/response shapes', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    const doc = response.json();
    const schemas = doc.components.schemas;
    expect(schemas.SaveAssessmentAnswersDto.required).toEqual(['answers']);
    expect(schemas.SaveAssessmentAnswersDto.properties.expectedRevision).toMatchObject({ type: 'integer', minimum: 0 });
    expect(schemas.PatientAssessmentSubmissionResponseDto.required).not.toContain('revision');
    const operation = doc.paths['/v1/assessment-submissions/{id}/submit'].post;
    expect(operation.requestBody.required).toBe(false);
    expect(operation.responses['200']).toBeDefined();
    expect(operation.responses['201']).toBeDefined();
    expect(operation.security).toEqual([{ bearerAuth: [] }]);
  });
});
