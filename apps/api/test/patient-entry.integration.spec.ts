import { randomUUID, createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_ENTRY_TEST_ISOLATED !== '1')('required patient entry on isolated PostgreSQL', () => {
  let app: NestFastifyApplication; let db: PrismaService; let clinicId: string; let sourceId: string; let admin: { token: string };
  const headers = (token: string) => ({ authorization: `Bearer ${token}` });
  const request = (actor: { token: string }, method: 'GET' | 'POST' | 'PUT', url: string, payload?: unknown) => app.inject({ method, url, headers: headers(actor.token), ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }) });
  const status = (actor: { token: string }) => request(actor, 'GET', '/v1/patients/me/entry');
  async function actor(role = 'PATIENT', old = false) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
    const targetRole = await db.role.findUniqueOrThrow({ where: { code: role as 'PATIENT' | 'ADMIN' | 'DOCTOR' } });
    await db.userRole.create({ data: { userId: auth.userId, roleId: targetRole.id } });
    if (old) await db.user.update({ where: { id: auth.userId }, data: { createdAt: new Date('2020-01-01') } });
    const patient = role === 'PATIENT' ? await db.patientProfile.create({ data: { userId: auth.userId, clinicId } }) : null;
    return { ...auth, patientId: patient?.id };
  }
  async function source(published = true) {
    const structure = { schemaVersion: 1, sections: [{ id: 's', title: 'Synthetic', questions: [{ id: 'q', text: 'Synthetic question', type: 'BOOLEAN', required: true, trueScore: 2, falseScore: 0 }] }], resultBands: [{ id: 'only', title: 'Synthetic result', minInclusive: 0, requiresReview: false }] };
    return db.assessmentVersion.create({ data: { clinicId, assessmentKey: `ENTRY_${randomUUID().slice(0, 8)}`, versionNumber: 1, locale: 'fa-IR', title: 'Synthetic entry', structure, contentHash: createHash('sha256').update(JSON.stringify(structure)).digest('hex'), status: published ? 'PUBLISHED' : 'DRAFT', publishedAt: published ? new Date() : null } });
  }
  async function policy(enabled: boolean, assessmentVersionId: string | null = sourceId) {
    const current = (await request(admin, 'GET', '/v1/admin/assessment-entry-policy')).json();
    return request(admin, 'PUT', '/v1/admin/assessment-entry-policy', { enabled, assessmentVersionId, expectedRevision: current.revision });
  }
  async function prepared() {
    const p = await actor();
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', birthDate: '1990-01-01' })).statusCode).toBe(200);
    const start = await request(p, 'POST', '/v1/patients/me/entry/start'); expect(start.statusCode).toBe(200);
    return { ...p, submissionId: start.json().submissionId as string };
  }
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || !/^\/patient_entry_verify_[a-f0-9]{32}$/.test(target.pathname)) throw new Error('Disposable entry database required');
    Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id; admin = await actor('ADMIN'); sourceId = (await source()).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });
  it('rejects anonymous and non-admin policy updates; rejects draft configuration', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/patients/me/entry' })).statusCode).toBe(401);
    const doctor = await actor('DOCTOR'); expect((await request(doctor, 'PUT', '/v1/admin/assessment-entry-policy', { enabled: true, assessmentVersionId: sourceId, expectedRevision: 0 })).statusCode).toBe(403);
    expect((await policy(true, (await source(false)).id)).statusCode).toBe(409);
    expect((await policy(true)).statusCode).toBe(200);
  });
  it('gates new private requests but preserves old accounts and does not provision intake/consent', async () => {
    const old = await actor('PATIENT', true); expect((await status(old)).json().required).toBe(false);
    const p = await actor(); expect((await status(p)).json().phase).toBe('PROFILE');
    const blocked = await request(p, 'GET', '/v1/patients/me/journey'); expect(blocked.statusCode).toBe(403); expect(blocked.json().code).toBe('PATIENT_ENTRY_REQUIRED');
    expect((await request(p, 'POST', `/v1/assessments/${sourceId}/submissions`)).statusCode).toBe(403);
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
    expect(await db.patientConsentRecord.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('validates basic details and resumes one bound source under concurrent start', async () => {
    const p = await actor();
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: ' ', lastName: 'Person', birthDate: '1990-02-30' })).statusCode).toBe(422);
    expect((await request(p, 'POST', '/v1/patients/me/entry/profile', { firstName: 'Synthetic', lastName: 'Person', birthDate: '1990-01-01' })).json().phase).toBe('ASSESSMENT');
    const started = await Promise.all([request(p, 'POST', '/v1/patients/me/entry/start'), request(p, 'POST', '/v1/patients/me/entry/start')]);
    expect(started.map(r => r.statusCode)).toEqual([200, 200]); expect(started[0].json().submissionId).toBe(started[1].json().submissionId);
    expect(await db.patientAssessmentSubmission.count({ where: { patientId: p.patientId } })).toBe(1);
  });
  it('enforces bound submission ownership, server completion and idempotent enter-Home', async () => {
    const p = await prepared(); const other = await prepared();
    expect((await request(p, 'GET', `/v1/assessment-submissions/${other.submissionId}`)).statusCode).toBe(403);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).statusCode).toBe(409);
    const saved = await request(p, 'PUT', `/v1/assessment-submissions/${p.submissionId}`, { answers: { q: true }, expectedRevision: 0 }); expect(saved.statusCode).toBe(200);
    const result = await app.inject({ method: 'POST', url: `/v1/assessment-submissions/${p.submissionId}/submit`, headers: { ...headers(p.token), 'Idempotency-Key': randomUUID() }, payload: { expectedRevision: saved.json().revision } }); expect(result.statusCode).toBe(201);
    expect((await status(p)).json().phase).toBe('RESULT');
    expect((await request(p, 'GET', '/v1/patients/me/journey')).statusCode).toBe(403);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).json().required).toBe(false);
    expect((await request(p, 'POST', '/v1/patients/me/entry/complete')).statusCode).toBe(200);
    expect((await request(p, 'GET', '/v1/patients/me/journey')).statusCode).toBe(200);
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('keeps started assessments pinned when ADMIN changes the selection', async () => {
    const p = await prepared(); const replacement = await source();
    expect((await policy(true, replacement.id)).statusCode).toBe(200);
    expect((await status(p)).json().assessmentVersionId).toBe(sourceId);
    const newer = await prepared(); expect((await status(newer)).json().assessmentVersionId).toBe(replacement.id);
    expect((await policy(true)).statusCode).toBe(200);
  });
  it('shows unavailable sources explicitly and lets ADMIN disable a retired configuration', async () => {
    const temporary = await source(); expect((await policy(true, temporary.id)).statusCode).toBe(200);
    const p = await actor(); await db.assessmentVersion.update({ where: { id: temporary.id }, data: { status: 'RETIRED', retiredAt: new Date() } });
    expect((await status(p)).json().phase).toBe('UNAVAILABLE');
    expect((await policy(false, temporary.id)).statusCode).toBe(200); expect((await status(p)).json().required).toBe(false);
  });
});
