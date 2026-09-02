import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('patient appointment create (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const userIds = new Set<string>();
  const holdIds = new Set<string>();

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); }, 30_000);
  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.appointmentStatusHistory.deleteMany({ where: { appointment: { idempotencyActorUserId: { in: users } } } });
    await prisma.appointment.deleteMany({ where: { idempotencyActorUserId: { in: users } } });
    if (holdIds.size) await prisma.appointmentHold.deleteMany({ where: { id: { in: [...holdIds] } } });
    await prisma.patientMedicalIntakeRevision.deleteMany({ where: { intake: { patient: { userId: { in: users } } } } });
    await prisma.patientConsentRecord.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.patientMedicalIntake.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    userIds.clear();
    holdIds.clear();
  });
  afterAll(async () => { await app.close(); });

  const headers = (token: string, key?: string) => ({ authorization: `Bearer ${token}`, origin: 'http://localhost:3000', ...(key ? { 'idempotency-key': key } : {}) });

  const patient = async (complete = true) => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const policy = await prisma.consentPolicyVersion.findFirstOrThrow({ where: { clinicId: clinic.id, policyKey: 'MEDICAL_INTAKE_PROCESSING', locale: 'fa-IR', status: 'ACTIVE' } });
    const user = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }); userIds.add(user.id);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, clinicId: clinic.id } });
    if (complete) {
      await prisma.userProfile.create({ data: { userId: user.id, firstName: 'Test', lastName: 'Patient' } });
      const consent = await prisma.patientConsentRecord.create({ data: { patientId: profile.id, policyVersionId: policy.id, contentHash: policy.contentHash, acceptedByUserId: user.id, acceptanceIdempotencyKey: randomUUID() } });
      const intake = await prisma.patientMedicalIntake.create({ data: { patientId: profile.id, clinicId: clinic.id, currentRevisionNumber: 1, completedRevisionNumber: 1, submissionState: 'COMPLETE' } });
      await prisma.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'COMPLETE', birthDate: new Date('1990-01-01T00:00:00Z'), sexAtBirth: 'FEMALE', allergyReport: { status: 'NONE', items: [] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, completedAt: new Date(), completedConsentRecordId: consent.id, mutationOperation: 'COMPLETE', mutationKey: randomUUID(), recordingMode: 'PATIENT_ENTRY', reportedPatientId: profile.id, payloadHash: randomUUID().replaceAll('-', '').repeat(2) } });
    }
    const token = await app.get(AccessTokenService).issue({ userId: user.id, sessionId: randomUUID(), roles: ['PATIENT'] });
    return { user, profile, token };
  };

  const nextWeekday = (weekday: number) => {
    const date = new Date();
    do date.setUTCDate(date.getUTCDate() + 1); while (((date.getUTCDay() + 6) % 7) + 1 !== weekday);
    return date.toISOString().slice(0, 10);
  };

  it('authoritatively rechecks eligibility and creates one pending appointment with an immutable price snapshot', async () => {
    const { token, profile } = await patient();
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: profile.clinicId, isActive: true, publicationStatus: 'PUBLISHED' }, include: { doctor: true } });
    const day = nextWeekday((await prisma.availabilityRule.findFirstOrThrow({ where: { clinicId: profile.clinicId, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true } })).isoWeekday);
    const available = await app.inject({ method: 'GET', url: `/v1/directory/doctor-services/${offering.id}/availability?fromDate=${day}&toDate=${day}&pageSize=100`, headers: headers(token) });
    expect(available.statusCode).toBe(200);
    const slot = available.json().items[0];
    const create = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(token, 'patient-appointment-create'), payload: { doctorServiceId: offering.id, startsAt: slot.startsAt } });
    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({ patientId: profile.id, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: slot.startsAt, status: 'PENDING', priceAmount: offering.priceAmount, currency: 'IRR' });
    const record = await prisma.appointment.findUniqueOrThrow({ where: { id: create.json().id }, include: { statusHistory: true } });
    expect(record.statusHistory).toHaveLength(1);
    expect(record.statusHistory[0]).toMatchObject({ action: 'CREATED', toStatus: 'PENDING', actorUserId: profile.userId });
    const hold = await prisma.appointmentHold.findFirst({ where: { clinicId: profile.clinicId, startsAt: record.startsAt, releasedAt: { not: null } } });
    expect(hold).not.toBeNull();
    holdIds.add(hold!.id);
    const listed = await app.inject({ method: 'GET', url: '/v1/appointments?page=1&pageSize=20', headers: headers(token) });
    const detail = await app.inject({ method: 'GET', url: `/v1/appointments/${record.id}`, headers: headers(token) });
    expect(listed.json()).toMatchObject({ total: 1, items: [{ id: record.id }] });
    expect(detail.json()).toMatchObject({ id: record.id, patientId: profile.id });
    const rescheduled = await app.inject({ method: 'POST', url: `/v1/appointments/${record.id}/reschedule`, headers: headers(token), payload: { doctorServiceId: offering.id, startsAt: available.json().items[1].startsAt } });
    expect(rescheduled.statusCode).toBe(200);
    expect(rescheduled.json()).toMatchObject({ id: record.id, status: 'PENDING', startsAt: available.json().items[1].startsAt });
    const cancelled = await app.inject({ method: 'POST', url: `/v1/appointments/${record.id}/cancel`, headers: headers(token), payload: { reason: 'Changed plans' } });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json()).toMatchObject({ id: record.id, status: 'CANCELLED' });
  });

  it('rejects creation at the use-case boundary when onboarding is no longer eligible', async () => {
    const { token, profile } = await patient(false);
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: profile.clinicId, isActive: true, publicationStatus: 'PUBLISHED' } });
    const rule = await prisma.availabilityRule.findFirstOrThrow({ where: { clinicId: profile.clinicId, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true } });
    const day = nextWeekday(rule.isoWeekday);
    const available = await app.inject({ method: 'GET', url: `/v1/directory/doctor-services/${offering.id}/availability?fromDate=${day}&toDate=${day}&pageSize=100`, headers: headers(token) });
    const rejected = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(token, 'ineligible-patient'), payload: { doctorServiceId: offering.id, startsAt: available.json().items[0].startsAt } });
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().code).toBe('BOOKING_INELIGIBLE');
    expect(await prisma.appointment.count({ where: { idempotencyActorUserId: profile.userId } })).toBe(0);
  });

  it('returns the original appointment for the same key and rejects a different normalized request', async () => {
    const { token, profile } = await patient();
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: profile.clinicId, isActive: true, publicationStatus: 'PUBLISHED' } });
    const rule = await prisma.availabilityRule.findFirstOrThrow({ where: { clinicId: profile.clinicId, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true } });
    const day = nextWeekday(rule.isoWeekday);
    const available = await app.inject({ method: 'GET', url: `/v1/directory/doctor-services/${offering.id}/availability?fromDate=${day}&toDate=${day}&pageSize=100`, headers: headers(token) });
    const [first, second] = available.json().items;
    const payload = { doctorServiceId: offering.id, startsAt: first.startsAt };
    const created = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(token, 'same-key'), payload });
    const replay = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(token, 'same-key'), payload });
    const changed = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(token, 'same-key'), payload: { doctorServiceId: offering.id, startsAt: second.startsAt } });
    expect(replay.statusCode).toBe(201);
    expect(replay.json().id).toBe(created.json().id);
    expect(changed.statusCode).toBe(409);
    expect(changed.json().code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await prisma.appointment.count({ where: { idempotencyActorUserId: profile.userId } })).toBe(1);
    const competing = await patient();
    const collision = await app.inject({ method: 'POST', url: '/v1/appointments', headers: headers(competing.token, 'competing-slot'), payload });
    expect(collision.statusCode).toBe(409);
    expect(collision.json().code).toBe('APPOINTMENT_SLOT_CONFLICT');
    const hold = await prisma.appointmentHold.findFirst({ where: { clinicId: profile.clinicId, startsAt: new Date(first.startsAt), releasedAt: { not: null } } });
    if (hold) holdIds.add(hold.id);
  });
});
