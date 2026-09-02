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
    await prisma.queueEntry.deleteMany({ where: { appointment: { idempotencyActorUserId: { in: users } } } });
    await prisma.operationalActivity.deleteMany({ where: { appointment: { idempotencyActorUserId: { in: users } } } });
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

  it('lets an administrator create, filter, confirm, reschedule, and cancel clinic appointments under lifecycle policy', async () => {
    const { profile, token } = await patient();
    const adminId = randomUUID(); userIds.add(adminId);
    const adminToken = await app.get(AccessTokenService).issue({ userId: adminId, sessionId: randomUUID(), roles: ['ADMIN'] });
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: profile.clinicId, isActive: true, publicationStatus: 'PUBLISHED' } });
    const rule = await prisma.availabilityRule.findFirstOrThrow({ where: { clinicId: profile.clinicId, doctorId: offering.doctorId, visitMode: offering.visitMode, isActive: true } });
    const day = nextWeekday(rule.isoWeekday);
    const available = await app.inject({ method: 'GET', url: `/v1/directory/doctor-services/${offering.id}/availability?fromDate=${day}&toDate=${day}&pageSize=100`, headers: headers(token) });
    const [first, second] = available.json().items;
    const adminHeaders = (key?: string) => headers(adminToken, key);
    const create = await app.inject({ method: 'POST', url: '/v1/admin/appointments', headers: adminHeaders('admin-create'), payload: { patientId: profile.id, doctorServiceId: offering.id, startsAt: first.startsAt } });
    expect(create.statusCode).toBe(201); expect(create.json()).toMatchObject({ patientId: profile.id, status: 'PENDING' });
    const replay = await app.inject({ method: 'POST', url: '/v1/admin/appointments', headers: adminHeaders('admin-create'), payload: { patientId: profile.id, doctorServiceId: offering.id, startsAt: first.startsAt } });
    expect(replay.statusCode).toBe(201); expect(replay.json().id).toBe(create.json().id);
    const listed = await app.inject({ method: 'GET', url: `/v1/admin/appointments?patientId=${profile.id}&status=PENDING`, headers: adminHeaders() });
    expect(listed.statusCode).toBe(200); expect(listed.json()).toMatchObject({ total: 1, items: [{ id: create.json().id, patientId: profile.id }] });
    const confirmed = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${create.json().id}/confirm`, headers: adminHeaders() });
    expect(confirmed.statusCode).toBe(200); expect(confirmed.json()).toMatchObject({ status: 'CONFIRMED' });
    const rescheduled = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${create.json().id}/reschedule`, headers: adminHeaders(), payload: { doctorServiceId: offering.id, startsAt: second.startsAt } });
    expect(rescheduled.statusCode).toBe(200); expect(rescheduled.json()).toMatchObject({ status: 'PENDING', startsAt: second.startsAt });
    const cancelled = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${create.json().id}/cancel`, headers: adminHeaders(), payload: { reason: 'Clinic scheduling change' } });
    expect(cancelled.statusCode).toBe(200); expect(cancelled.json()).toMatchObject({ status: 'CANCELLED' });
    const history = await prisma.appointmentStatusHistory.findMany({ where: { appointmentId: create.json().id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((item) => item.action)).toEqual(['CREATED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED']);
    const patientTimeline = await app.inject({ method: 'GET', url: `/v1/appointments/${create.json().id}/history?page=1&pageSize=20`, headers: headers(token) });
    expect(patientTimeline.statusCode).toBe(200); expect(patientTimeline.json()).toMatchObject({ total: 4, items: [{ action: 'CREATED' }, { action: 'CONFIRMED' }, { action: 'RESCHEDULED' }, { action: 'CANCELLED', reason: 'Clinic scheduling change' }] });
    const adminTimeline = await app.inject({ method: 'GET', url: `/v1/admin/appointments/${create.json().id}/history?page=1&pageSize=20`, headers: adminHeaders() });
    expect(adminTimeline.statusCode).toBe(200); expect(adminTimeline.json()).toMatchObject({ total: 4, items: [{ action: 'CREATED' }, { action: 'CONFIRMED' }, { action: 'RESCHEDULED' }, { action: 'CANCELLED', reason: 'Clinic scheduling change' }] });
    const activities = await app.inject({ method: 'GET', url: `/v1/admin/appointments/operational-activities?appointmentId=${create.json().id}&page=1&pageSize=20`, headers: adminHeaders() });
    expect(activities.statusCode).toBe(200); expect(activities.json()).toMatchObject({ total: 4, items: [{ type: 'APPOINTMENT_CANCELLED' }, { type: 'APPOINTMENT_RESCHEDULED' }, { type: 'APPOINTMENT_CONFIRMED' }, { type: 'APPOINTMENT_CREATED' }] });
    const past = await prisma.appointment.create({ data: { clinicId: profile.clinicId, patientId: profile.id, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: new Date(Date.now() - 3_600_000), endsAt: new Date(Date.now() - 1_800_000), status: 'CONFIRMED', priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: new Date(), idempotencyActorUserId: adminId, idempotencyKey: 'admin-past-policy', idempotencyRequestHash: randomUUID().replaceAll('-', '').repeat(2) } });
    const rejectedPastCancel = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${past.id}/cancel`, headers: adminHeaders(), payload: {} });
    expect(rejectedPastCancel.statusCode).toBe(409); expect(rejectedPastCancel.json().code).toBe('APPOINTMENT_CHANGE_NOT_ALLOWED');
    const reasonedPastCancel = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${past.id}/cancel`, headers: adminHeaders(), payload: { reason: 'Patient did not arrive' } });
    expect(reasonedPastCancel.statusCode).toBe(200); expect(reasonedPastCancel.json()).toMatchObject({ status: 'CANCELLED' });
  });

  it('runs the administrator check-in, queue, call-next, start, complete, and no-show state machine safely', async () => {
    const { profile } = await patient();
    const adminId = randomUUID(); userIds.add(adminId);
    const adminToken = await app.get(AccessTokenService).issue({ userId: adminId, sessionId: randomUUID(), roles: ['ADMIN'] });
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: profile.clinicId, isActive: true, publicationStatus: 'PUBLISHED' } });
    const headersForAdmin = () => headers(adminToken);
    const appointment = async (status: 'CONFIRMED' | 'CHECKED_IN', startsAt: Date, endsAt: Date) => prisma.appointment.create({ data: { clinicId: profile.clinicId, patientId: profile.id, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt, endsAt, status, confirmedAt: status === 'CONFIRMED' ? new Date() : new Date(), checkedInAt: status === 'CHECKED_IN' ? new Date() : null, priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: new Date(), idempotencyActorUserId: adminId, idempotencyKey: randomUUID(), idempotencyRequestHash: randomUUID().replaceAll('-', '').repeat(2) } });
    const now = Date.now();
    const current = await appointment('CONFIRMED', new Date(now - 5 * 60_000), new Date(now + 25 * 60_000));
    const checkIn = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/check-in`, headers: headersForAdmin() });
    expect(checkIn.statusCode).toBe(200); expect(checkIn.json()).toMatchObject({ status: 'CHECKED_IN' });
    const repeatCheckIn = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/check-in`, headers: headersForAdmin() });
    expect(repeatCheckIn.statusCode).toBe(200); expect(repeatCheckIn.json().id).toBe(current.id);
    const queued = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/queue`, headers: headersForAdmin() });
    expect(queued.statusCode).toBe(200); expect(queued.json()).toMatchObject({ status: 'QUEUED' });
    const repeatQueue = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/queue`, headers: headersForAdmin() });
    expect(repeatQueue.statusCode).toBe(200); expect(await prisma.queueEntry.count({ where: { appointmentId: current.id } })).toBe(1);
    const started = await app.inject({ method: 'POST', url: `/v1/admin/appointments/doctors/${offering.doctorId}/call-next`, headers: headersForAdmin() });
    expect(started.statusCode).toBe(200); expect(started.json()).toMatchObject({ id: current.id, status: 'IN_PROGRESS' });
    const queue = await app.inject({ method: 'GET', url: '/v1/admin/appointments/queue', headers: headersForAdmin() });
    expect(queue.statusCode).toBe(200); expect(queue.json()).toMatchObject({ items: [{ appointment: { id: current.id, status: 'IN_PROGRESS' } }] });
    const repeatCallNext = await app.inject({ method: 'POST', url: `/v1/admin/appointments/doctors/${offering.doctorId}/call-next`, headers: headersForAdmin() });
    expect(repeatCallNext.statusCode).toBe(200); expect(repeatCallNext.json().id).toBe(current.id);
    const dashboardSummary = await app.inject({ method: 'GET', url: '/v1/admin/appointments/dashboard-summary', headers: headersForAdmin() });
    expect(dashboardSummary.statusCode).toBe(200); expect(dashboardSummary.json()).toMatchObject({ timeZone: 'Asia/Tehran', inProgress: 1 }); expect(dashboardSummary.json().todayPlan).toEqual(expect.arrayContaining([expect.objectContaining({ id: current.id, status: 'IN_PROGRESS', visitMode: offering.visitMode })])); expect(dashboardSummary.json().recentAppointmentActivity).toEqual(expect.arrayContaining([expect.objectContaining({ appointmentId: current.id, type: 'APPOINTMENT_STARTED' })]));
    expect(dashboardSummary.json().averageWaitMinutes).toEqual(expect.any(Number));
    const another = await appointment('CHECKED_IN', new Date(now + 2 * 86_400_000), new Date(now + 2 * 86_400_000 + 30 * 60_000));
    const busy = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${another.id}/start`, headers: headersForAdmin() });
    expect(busy.statusCode).toBe(409); expect(busy.json().code).toBe('APPOINTMENT_DOCTOR_BUSY');
    const complete = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/complete`, headers: headersForAdmin() });
    expect(complete.statusCode).toBe(200); expect(complete.json()).toMatchObject({ status: 'COMPLETED' });
    const repeatComplete = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${current.id}/complete`, headers: headersForAdmin() });
    expect(repeatComplete.statusCode).toBe(200); expect(repeatComplete.json().id).toBe(current.id);
    const empty = await app.inject({ method: 'POST', url: `/v1/admin/appointments/doctors/${offering.doctorId}/call-next`, headers: headersForAdmin() });
    expect(empty.statusCode).toBe(409); expect(empty.json().code).toBe('QUEUE_EMPTY');
    const absent = await appointment('CONFIRMED', new Date(now - 3 * 60 * 60_000), new Date(now - 2 * 60 * 60_000));
    const noShow = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${absent.id}/no-show`, headers: headersForAdmin() });
    expect(noShow.statusCode).toBe(200); expect(noShow.json()).toMatchObject({ status: 'NO_SHOW' });
    const repeatNoShow = await app.inject({ method: 'POST', url: `/v1/admin/appointments/${absent.id}/no-show`, headers: headersForAdmin() });
    expect(repeatNoShow.statusCode).toBe(200); expect(repeatNoShow.json().id).toBe(absent.id);
    const history = await prisma.appointmentStatusHistory.findMany({ where: { appointmentId: current.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((item) => item.action)).toEqual(['CHECKED_IN', 'QUEUED', 'STARTED', 'COMPLETED']);
    const activities = await prisma.operationalActivity.findMany({ where: { appointmentId: current.id }, orderBy: { createdAt: 'asc' } });
    expect(activities.map((item) => item.type)).toEqual(['APPOINTMENT_CHECKED_IN', 'APPOINTMENT_QUEUED', 'APPOINTMENT_STARTED', 'APPOINTMENT_COMPLETED']);
  });
});
