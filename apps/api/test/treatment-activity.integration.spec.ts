import { completeTestPatientEntry, clearTestPatientEntries } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('treatment activity API (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let accessTokens: AccessTokenService;
  const userIds = new Set<string>();
  const createdDoctorPermissions = new Set<'CLINICAL_RECORD_VIEW' | 'CLINICAL_RECORD_EDIT'>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    accessTokens = app.get(AccessTokenService);
  }, 30_000);

  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.patientAccessAudit.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.medicationAdherenceLog.deleteMany({ where: { treatmentMedication: { treatmentPlan: { patient: { userId: { in: users } } } } } });
    await prisma.treatmentProgressEvent.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    const taskIds = (await prisma.treatmentTask.findMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } }, select: { id: true } })).map((task) => task.id);
    if (taskIds.length) await prisma.outboxEvent.deleteMany({ where: { aggregateType: 'TREATMENT_TASK', aggregateId: { in: taskIds } } });
    await prisma.treatmentTask.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.treatmentMedication.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.exercisePlan.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.treatmentPlan.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: { in: users } } });
    await prisma.session.deleteMany({ where: { userId: { in: users } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: users } } });
    if (createdDoctorPermissions.size) {
      await prisma.clinicalRolePermission.deleteMany({ where: { role: { code: 'DOCTOR' }, permission: { in: [...createdDoctorPermissions] } } });
      createdDoctorPermissions.clear();
    }
    await clearTestPatientEntries(prisma, { userId: { in: users } }); await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    userIds.clear();
  });

  afterAll(async () => { await app.close(); });

  const fixture = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const [doctorRole, patientRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'PATIENT' } }),
    ]);
    const [patientUser, clinician] = await Promise.all([
      prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }),
      prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }),
    ]);
    userIds.add(patientUser.id); userIds.add(clinician.id);
    const patient = await prisma.patientProfile.create({ data: { userId: patientUser.id, clinicId: clinic.id } }); await completeTestPatientEntry(prisma, patientUser.id);
    await prisma.userRole.createMany({ data: [{ userId: patientUser.id, roleId: patientRole.id }, { userId: clinician.id, roleId: doctorRole.id }] });
    await prisma.clinicalClinicAccess.create({ data: { userId: clinician.id, clinicId: clinic.id } });
    const permissions = ['CLINICAL_RECORD_VIEW', 'CLINICAL_RECORD_EDIT'] as const;
    const existing = new Set((await prisma.clinicalRolePermission.findMany({ where: { roleId: doctorRole.id, permission: { in: [...permissions] } }, select: { permission: true } })).map((entry) => entry.permission));
    const missing = permissions.filter((permission) => !existing.has(permission));
    if (missing.length) {
      await prisma.clinicalRolePermission.createMany({ data: missing.map((permission) => ({ roleId: doctorRole.id, permission })), skipDuplicates: true });
      for (const permission of missing) createdDoctorPermissions.add(permission);
    }
    const [clinicianSession, patientSession] = await Promise.all([
      prisma.session.create({ data: { userId: clinician.id, refreshTokenHash: `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`, expiresAt: new Date(Date.now() + 60 * 60_000) } }),
      prisma.session.create({ data: { userId: patientUser.id, refreshTokenHash: `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`, expiresAt: new Date(Date.now() + 60 * 60_000) } }),
    ]);
    const [doctorToken, patientToken] = await Promise.all([
      accessTokens.issue({ userId: clinician.id, sessionId: clinicianSession.id, roles: ['DOCTOR'] }),
      accessTokens.issue({ userId: patientUser.id, sessionId: patientSession.id, roles: ['PATIENT'] }),
    ]);
    return { patient, clinician, doctorToken, patientToken };
  };

  const request = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: unknown, headers: Record<string, string> = {}) => app.inject({ method, url, headers: { authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });

  const activePlan = async (patientId: string, doctorToken: string, name = 'Active plan') => {
    const created = await request('POST', `/v1/admin/patients/${patientId}/treatment-plans`, doctorToken, { title: name, medications: [{ name: 'Medication one' }, { name: 'Medication two' }], exercisePlans: [{ title: 'Walking' }] });
    expect(created.statusCode).toBe(201);
    const plan = created.json() as { id: string; medications: Array<{ id: string }>; exercisePlans: Array<{ id: string }> };
    const activated = await request('PATCH', `/v1/admin/patients/${patientId}/treatment-plans/${plan.id}`, doctorToken, { state: 'ACTIVE' });
    expect(activated.statusCode).toBe(200);
    return plan;
  };

  it('schedules, reschedules, cancels, lists, and repeat-safely completes one-off medication or exercise tasks', async () => {
    const { patient, doctorToken, patientToken } = await fixture();
    const plan = await activePlan(patient.id, doctorToken);
    const medicationAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const exerciseAt = new Date(Date.now() + 48 * 60 * 60_000).toISOString();
    const medication = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken, { kind: 'MEDICATION', scheduledFor: medicationAt });
    const exercise = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken, { kind: 'EXERCISE', scheduledFor: exerciseAt });
    expect(medication.statusCode).toBe(201); expect(exercise.statusCode).toBe(201);
    const medicationTask = medication.json() as { id: string; state: string; scheduledFor: string };
    expect(medicationTask).toMatchObject({ state: 'SCHEDULED', scheduledFor: medicationAt });
    expect(await prisma.outboxEvent.count({ where: { aggregateType: 'TREATMENT_TASK', aggregateId: { in: [medicationTask.id, exercise.json().id] }, status: 'PENDING' } })).toBe(2);

    const past = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken, { kind: 'MEDICATION', scheduledFor: new Date(Date.now() - 60_000).toISOString() });
    expect(past.statusCode).toBe(422); expect(past.json()).toMatchObject({ code: 'TREATMENT_TASK_SCHEDULE_INVALID' });

    const rescheduledAt = new Date(Date.now() + 72 * 60 * 60_000).toISOString();
    const rescheduled = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks/${medicationTask.id}`, doctorToken, { scheduledFor: rescheduledAt });
    expect(rescheduled.statusCode).toBe(200); expect(rescheduled.json()).toMatchObject({ id: medicationTask.id, scheduledFor: rescheduledAt });
    expect(await prisma.outboxEvent.groupBy({ by: ['status'], where: { aggregateType: 'TREATMENT_TASK', aggregateId: medicationTask.id }, _count: true })).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'FAILED', _count: 1 }), expect.objectContaining({ status: 'PENDING', _count: 1 })]));

    const patientTasks = await request('GET', '/v1/patients/me/treatment/tasks', patientToken);
    expect(patientTasks.statusCode).toBe(200);
    expect(patientTasks.json()).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ id: medicationTask.id, kind: 'MEDICATION' }), expect.objectContaining({ kind: 'EXERCISE' })]) });

    const firstCompletion = await request('POST', `/v1/patients/me/treatment/tasks/${medicationTask.id}/complete`, patientToken);
    const replayCompletion = await request('POST', `/v1/patients/me/treatment/tasks/${medicationTask.id}/complete`, patientToken);
    expect(firstCompletion.statusCode).toBe(200); expect(replayCompletion.statusCode).toBe(200);
    expect(replayCompletion.json()).toMatchObject({ id: medicationTask.id, state: 'COMPLETED', completedAt: firstCompletion.json().completedAt });
    expect(await prisma.patientAccessAudit.count({ where: { patientId: patient.id, resourceType: 'PATIENT_TREATMENT_TASK', action: 'UPDATE' } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateType: 'TREATMENT_TASK', aggregateId: medicationTask.id, status: 'PENDING' } })).toBe(0);

    const exerciseTask = exercise.json() as { id: string };
    const cancelled = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks/${exerciseTask.id}/cancel`, doctorToken);
    expect(cancelled.statusCode).toBe(200); expect(cancelled.json()).toMatchObject({ id: exerciseTask.id, state: 'CANCELLED' });
    expect(await prisma.outboxEvent.count({ where: { aggregateType: 'TREATMENT_TASK', aggregateId: exerciseTask.id, status: 'PENDING' } })).toBe(0);
    const afterCancel = await request('GET', '/v1/patients/me/treatment/tasks', patientToken);
    expect(afterCancel.json().items).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: exerciseTask.id })]));
  });

  it('records medication adherence exactly once per idempotency key and validates the optional matching task', async () => {
    const { patient, doctorToken, patientToken } = await fixture();
    const plan = await activePlan(patient.id, doctorToken);
    const medicationTask = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken, { kind: 'MEDICATION', scheduledFor: new Date(Date.now() + 24 * 60 * 60_000).toISOString() });
    const exerciseTask = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken, { kind: 'EXERCISE', scheduledFor: new Date(Date.now() + 48 * 60 * 60_000).toISOString() });
    const medTaskId = medicationTask.json().id as string;
    const key = `adherence-${randomUUID()}`;
    const first = await request('POST', `/v1/patients/me/treatment/medications/${plan.medications[0]!.id}/adherence`, patientToken, { treatmentTaskId: medTaskId }, { 'idempotency-key': key });
    const replay = await request('POST', `/v1/patients/me/treatment/medications/${plan.medications[0]!.id}/adherence`, patientToken, { treatmentTaskId: medTaskId }, { 'idempotency-key': key });
    expect(first.statusCode).toBe(200); expect(replay.statusCode).toBe(200);
    expect(replay.json()).toMatchObject({ id: first.json().id, treatmentTaskId: medTaskId });
    expect(await prisma.medicationAdherenceLog.count({ where: { treatmentMedicationId: plan.medications[0]!.id } })).toBe(1);

    const reused = await request('POST', `/v1/patients/me/treatment/medications/${plan.medications[1]!.id}/adherence`, patientToken, {}, { 'idempotency-key': key });
    expect(reused.statusCode).toBe(409); expect(reused.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });

    const missingKey = await request('POST', `/v1/patients/me/treatment/medications/${plan.medications[0]!.id}/adherence`, patientToken, {});
    expect(missingKey.statusCode).toBe(422); expect(missingKey.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });

    const wrongTask = await request('POST', `/v1/patients/me/treatment/medications/${plan.medications[0]!.id}/adherence`, patientToken, { treatmentTaskId: exerciseTask.json().id }, { 'idempotency-key': `adherence-${randomUUID()}` });
    expect(wrongTask.statusCode).toBe(422); expect(wrongTask.json()).toMatchObject({ code: 'TREATMENT_ADHERENCE_TASK_INVALID' });
  });

  it('enforces the existing clinic resource boundary and declares the runtime task activity API', async () => {
    const { patient, clinician, doctorToken } = await fixture();
    const plan = await activePlan(patient.id, doctorToken);
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: clinician.id } });
    const denied = await request('GET', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/tasks`, doctorToken);
    expect(denied.statusCode).toBe(403);

    const document = await app.inject({ method: 'GET', url: '/docs-json' });
    expect(document.statusCode).toBe(200);
    expect((document.json() as { paths: Record<string, unknown> }).paths).toHaveProperty('/v1/admin/patients/{patientId}/treatment-plans/{planId}/tasks');
    expect((document.json() as { paths: Record<string, unknown> }).paths).toHaveProperty('/v1/patients/me/treatment/medications/{medicationId}/adherence');
  });
});
