import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { createTestAccessToken } from './auth-test-support';

describe.skipIf(process.env.PATIENT_JOURNEY_TEST_ISOLATED !== '1')('patient journey (isolated PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let db: PrismaService;
  let clinicId: string;
  type Actor = Awaited<ReturnType<typeof patient>>;
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/patient_journey_test') throw new Error('Disposable patient_journey_test required.');
    Logger.overrideLogger(false);
    app = await createApiApplication(); await app.init(); db = app.get(PrismaService);
    clinicId = (await db.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id;
  }, 30_000);
  afterAll(async () => { await app?.close(); });

  async function patient(complete = false) {
    const auth = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    const role = await db.role.findUniqueOrThrow({ where: { code: 'PATIENT' } });
    await db.userRole.create({ data: { userId: auth.userId, roleId: role.id } });
    const profile = await db.patientProfile.create({ data: { userId: auth.userId, clinicId } });
    if (complete) {
      await db.userProfile.create({ data: { userId: auth.userId, firstName: 'Private first', lastName: 'Private last' } });
      const policy = await db.consentPolicyVersion.findFirstOrThrow({ where: { clinicId, policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: 'ACTIVE' } });
      const consent = await db.patientConsentRecord.create({ data: { patientId: profile.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: auth.userId, acceptanceIdempotencyKey: randomUUID() } });
      const intake = await db.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId, currentRevisionNumber: 1, completedRevisionNumber: 1, submissionState: 'COMPLETE' } });
      await db.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'COMPLETE', birthDate: new Date('1990-01-01T00:00:00Z'), sexAtBirth: 'FEMALE', allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, completedAt: new Date(), completedConsentRecordId: consent.id, mutationOperation: 'COMPLETE', mutationKey: randomUUID(), recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: 'a'.repeat(64) } });
    }
    return { ...auth, patientId: profile.id };
  }
  const get = (p: { token: string }, query = '') => app.inject({ method: 'GET', url: `/v1/patients/me/journey${query}`, headers: { authorization: `Bearer ${p.token}` } });
  async function attempt(p: Actor, status: 'PUBLISHED' | 'RETIRED' = 'PUBLISHED', scopeClinic = clinicId) {
    const version = await db.assessmentVersion.create({ data: { clinicId: scopeClinic, assessmentKey: 'MEZAJ', locale: `x-${randomUUID().slice(0, 8)}`, versionNumber: 1, title: 'Synthetic questionnaire', contentHash: 'a'.repeat(64), structure: {}, status, publishedAt: new Date(), ...(status === 'RETIRED' ? { retiredAt: new Date() } : {}) } });
    return db.patientAssessmentSubmission.create({ data: { patientId: p.patientId, assessmentVersionId: version.id, answers: { privateAnswer: 'must not leak' } } });
  }
  async function intent(p: Actor, expiresAt: Date | null = null) {
    return db.billingIntent.create({ data: { clinicId, patientId: p.patientId, actorUserId: p.userId, purpose: 'TOPUP', amountRial: 123450n, fingerprint: 'a'.repeat(64), idempotencyKey: randomUUID(), expiresAt, snapshot: { secret: 'must not leak' } } });
  }

  it('rejects anonymous and nonpatient roles', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/patients/me/journey' })).statusCode).toBe(401);
    for (const role of ['DOCTOR', 'STAFF', 'ADMIN']) {
      const actor = await createTestAccessToken(db, app.get(AccessTokenService), [role]);
      expect((await get(actor)).statusCode).toBe(403);
    }
  });
  it('derives incomplete progress without blocking independent shopping', async () => {
    const p = await patient(); const response = await get(p); expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.json()).toMatchObject({ onboarding: { isComplete: false, requiredCount: 8, answeredRequiredCount: 0 }, nextAction: { code: 'COMPLETE_PROFILE', resourceId: null }, storeAvailable: true });
    expect(await db.patientMedicalIntake.count({ where: { patientId: p.patientId } })).toBe(0);
  });
  it('does not provision a missing patient from a read', async () => {
    const p = await createTestAccessToken(db, app.get(AccessTokenService), ['PATIENT']);
    expect((await get(p)).statusCode).toBe(404);
    expect(await db.patientProfile.count({ where: { userId: p.userId } })).toBe(0);
  });
  it('uses existing completion and booking rules, never returns medical values', async () => {
    const p = await patient(true); const response = await get(p); expect(response.statusCode).toBe(200);
    expect(response.json().onboarding).toMatchObject({ state: 'COMPLETE', isComplete: true, requiredCount: 8, answeredRequiredCount: 8, missingFields: [] });
    for (const forbidden of ['Private first', 'Private last', '1990-01-01', 'FEMALE', 'allergyReport', 'activeConsentRecordId']) expect(response.body).not.toContain(forbidden);
  });
  it('isolates another patient and ignores identity overrides in query strings', async () => {
    const p = await patient(); const other = await patient(); const foreign = await attempt(other); await intent(other);
    const response = await get(p, `?patientId=${other.patientId}&clinicId=${clinicId}`);
    expect(response.json().assessments.items).toEqual([]); expect(response.json().pendingPayments.items).toEqual([]);
    expect(response.body).not.toContain(foreign.id);
  });
  it('does not return a cross-clinic assessment even when its patient id matches', async () => {
    const p = await patient(); const clinic = await db.clinic.create({ data: { name: 'Synthetic other clinic', status: 'INACTIVE' } });
    const foreign = await attempt(p, 'PUBLISHED', clinic.id); const response = await get(p);
    expect(response.body).not.toContain(foreign.id);
  });
  it('exposes retired draft references without promising resume or leaking answers', async () => {
    const p = await patient(); const draft = await attempt(p, 'RETIRED'); const response = await get(p);
    expect(response.json().assessments.items[0]).toMatchObject({ id: draft.id, resumeAvailable: false, resumeBlocker: 'VERSION_NOT_PUBLISHED' });
    expect(response.body).not.toContain('privateAnswer'); expect(response.body).not.toContain('must not leak');
  });
  it('caps all Home collections and preserves resume action behind newer retired drafts', async () => {
    const p = await patient(true); const valid = await attempt(p);
    for (let n = 0; n < 7; n++) { await attempt(p, 'RETIRED'); await intent(p); await db.treatmentPlan.create({ data: { clinicId, patientId: p.patientId, state: 'ACTIVE', title: 'Private treatment title' } }); }
    const response = await get(p); const body = response.json();
    for (const key of ['assessments', 'pendingPayments', 'treatmentPlans']) { expect(body[key].items).toHaveLength(5); expect(body[key].hasMore).toBe(true); }
    expect(body.nextAction).toEqual({ code: 'RESUME_ASSESSMENT', resourceId: valid.id });
    expect(response.body).not.toContain('Private treatment title');
  });
  it('excludes expired payments and draft treatment plans; preserves integer currency', async () => {
    const p = await patient(true); const expired = await intent(p, new Date(Date.now() - 60_000)); const live = await intent(p);
    const draft = await db.treatmentPlan.create({ data: { clinicId, patientId: p.patientId, state: 'DRAFT', title: 'Never publish' } });
    const response = await get(p); expect(response.json().pendingPayments.items).toEqual([{ id: live.id, purpose: 'TOPUP', amountRial: '123450', currency: 'IRR', expiresAt: null }]);
    expect(response.body).not.toContain(expired.id); expect(response.body).not.toContain(draft.id); expect(response.body).not.toContain('snapshot');
    expect(response.json().nextAction).toEqual({ code: 'CONTINUE_PAYMENT', resourceId: live.id });
  });
  it('prioritizes a near appointment even when onboarding later becomes incomplete, without creating chat', async () => {
    const p = await patient();
    const baseline = await db.doctorService.findFirstOrThrow({ where: { clinicId } });
    const doctor = await db.doctorProfile.create({ data: { clinicId, displayName: 'Synthetic journey doctor' } });
    const service = await db.doctorService.create({ data: { clinicId, doctorId: doctor.id, serviceId: baseline.serviceId, visitMode: baseline.visitMode, durationMinutes: 15, priceAmount: baseline.priceAmount } });
    const appointment = await db.appointment.create({ data: { clinicId, patientId: p.patientId, doctorId: service.doctorId, doctorServiceId: service.id, startsAt: new Date(), endsAt: new Date(Date.now() + 15 * 60_000), status: 'CONFIRMED', priceAmount: service.priceAmount, currency: 'IRR', priceCapturedAt: new Date() } });
    const response = await get(p); expect(response.json().nextAction).toEqual({ code: 'OPEN_APPOINTMENT', resourceId: appointment.id });
    expect(await db.chatConversation.count({ where: { appointmentId: appointment.id } })).toBe(0);
    await db.appointment.update({ where: { id: appointment.id }, data: { status: 'COMPLETED' } });
    const terminal = await get(p); expect(terminal.json().appointments.items).toEqual([]); expect(terminal.json().nextAction.code).toBe('COMPLETE_PROFILE');
  });
  it('returns pending Store orders with explicit toman units and hides shipping data', async () => {
    const p = await patient();
    const order = await db.commerceOrder.create({ data: { clinicId, patientId: p.patientId, idempotencyKey: randomUUID(), shippingMethod: 'PICKUP', subtotalAmountToman: 123n, totalAmountToman: 123n, shippingDetailSnapshot: { privateAddress: 'must not leak' } } });
    const response = await get(p); expect(response.json().pendingOrders.items).toEqual([{ id: order.id, totalAmountToman: '123', currency: 'TOMAN' }]);
    expect(response.body).not.toContain('privateAddress');
  });
  it('records a minimized read audit and refuses a revoked session', async () => {
    const p = await patient(); expect((await get(p)).statusCode).toBe(200);
    const audit = await db.patientAccessAudit.findFirstOrThrow({ where: { patientId: p.patientId, resourceType: 'PATIENT_JOURNEY' } });
    expect(audit.metadata).toEqual({ view: 'HOME', assessmentCount: 0, appointmentCount: 0 });
    await db.session.update({ where: { id: p.sessionId }, data: { revokedAt: new Date(), revokedReason: 'LOGOUT' } });
    expect((await get(p)).statusCode).toBe(401);
  });
  it('fails closed if sensitive read audit cannot be persisted', async () => {
    const p = await patient();
    // UUID fixture only; the function is owned by this disposable database and removed in finally.
    if (!/^[a-f0-9-]{36}$/.test(p.patientId)) throw new Error('Invalid synthetic patient UUID');
    await db.$executeRawUnsafe(`CREATE FUNCTION journey_test_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.patient_id = '${p.patientId}'::uuid AND NEW.resource_type = 'PATIENT_JOURNEY' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRaw(Prisma.sql`CREATE TRIGGER journey_test_audit_fail BEFORE INSERT ON patient_access_audits FOR EACH ROW EXECUTE FUNCTION journey_test_audit_fail()`);
    try { const response = await get(p); expect(response.statusCode).toBe(503); expect(response.json().code).toBe('CLINICAL_AUDIT_UNAVAILABLE'); expect(response.body).not.toContain('onboarding'); }
    finally { await db.$executeRaw(Prisma.sql`DROP TRIGGER journey_test_audit_fail ON patient_access_audits`); await db.$executeRaw(Prisma.sql`DROP FUNCTION journey_test_audit_fail()`); }
  });
});
