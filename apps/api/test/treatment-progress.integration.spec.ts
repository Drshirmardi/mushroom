import { completeTestPatientEntry, clearTestPatientEntries } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('treatment progress API (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let tokens: AccessTokenService;
  const users = new Set<string>();
  const addedPermissions = new Set<'CLINICAL_RECORD_VIEW' | 'CLINICAL_RECORD_EDIT'>();

  beforeAll(async () => { app = await createApiApplication(); await app.init(); prisma = app.get(PrismaService); tokens = app.get(AccessTokenService); }, 30_000);
  afterAll(async () => { await app.close(); });
  afterEach(async () => {
    const ids = [...users]; if (!ids.length) return;
    await prisma.patientAccessAudit.deleteMany({ where: { patient: { userId: { in: ids } } } });
    await prisma.treatmentProgressEvent.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: ids } } } } });
    await prisma.medicationAdherenceLog.deleteMany({ where: { treatmentMedication: { treatmentPlan: { patient: { userId: { in: ids } } } } } });
    await prisma.treatmentTask.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: ids } } } } });
    await prisma.treatmentMedication.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: ids } } } } });
    await prisma.treatmentPlan.deleteMany({ where: { patient: { userId: { in: ids } } } });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: { in: ids } } }); await prisma.session.deleteMany({ where: { userId: { in: ids } } }); await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    if (addedPermissions.size) { await prisma.clinicalRolePermission.deleteMany({ where: { role: { code: 'DOCTOR' }, permission: { in: [...addedPermissions] } } }); addedPermissions.clear(); }
    await clearTestPatientEntries(prisma, { userId: { in: ids } }); await prisma.patientProfile.deleteMany({ where: { userId: { in: ids } } }); await prisma.user.deleteMany({ where: { id: { in: ids } } }); users.clear();
  });

  const fixture = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const [doctorRole, patientRole] = await Promise.all([prisma.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } }), prisma.role.findUniqueOrThrow({ where: { code: 'PATIENT' } })]);
    const [patientUser, doctor] = await Promise.all([prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }), prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } })]); users.add(patientUser.id); users.add(doctor.id);
    const patient = await prisma.patientProfile.create({ data: { userId: patientUser.id, clinicId: clinic.id } }); await completeTestPatientEntry(prisma, patientUser.id);
    await prisma.userRole.createMany({ data: [{ userId: patientUser.id, roleId: patientRole.id }, { userId: doctor.id, roleId: doctorRole.id }] }); await prisma.clinicalClinicAccess.create({ data: { userId: doctor.id, clinicId: clinic.id } });
    const permissions = ['CLINICAL_RECORD_VIEW', 'CLINICAL_RECORD_EDIT'] as const; const existing = new Set((await prisma.clinicalRolePermission.findMany({ where: { roleId: doctorRole.id, permission: { in: [...permissions] } }, select: { permission: true } })).map((entry) => entry.permission)); const missing = permissions.filter((permission) => !existing.has(permission));
    if (missing.length) { await prisma.clinicalRolePermission.createMany({ data: missing.map((permission) => ({ roleId: doctorRole.id, permission })), skipDuplicates: true }); missing.forEach((permission) => addedPermissions.add(permission)); }
    const [doctorSession, patientSession] = await Promise.all([prisma.session.create({ data: { userId: doctor.id, refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''), expiresAt: new Date(Date.now() + 3_600_000) } }), prisma.session.create({ data: { userId: patientUser.id, refreshTokenHash: randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', ''), expiresAt: new Date(Date.now() + 3_600_000) } })]);
    const [doctorToken, patientToken] = await Promise.all([tokens.issue({ userId: doctor.id, sessionId: doctorSession.id, roles: ['DOCTOR'] }), tokens.issue({ userId: patientUser.id, sessionId: patientSession.id, roles: ['PATIENT'] })]);
    const plan = await prisma.treatmentPlan.create({ data: { clinicId: clinic.id, patientId: patient.id, state: 'ACTIVE', title: 'Progress' } }); const medication = await prisma.treatmentMedication.create({ data: { treatmentPlanId: plan.id, name: 'Medication', updatedAt: new Date() } });
    const [firstTask, secondTask] = await Promise.all([prisma.treatmentTask.create({ data: { treatmentPlanId: plan.id, kind: 'MEDICATION', scheduledFor: new Date(Date.now() + 3_600_000) } }), prisma.treatmentTask.create({ data: { treatmentPlanId: plan.id, kind: 'EXERCISE', scheduledFor: new Date(Date.now() + 7_200_000) } })]);
    return { patient, doctor, plan, medication, firstTask, secondTask, doctorToken, patientToken };
  };
  const request = (method: 'GET' | 'POST', url: string, token: string, payload?: unknown, headers: Record<string, string> = {}) => app.inject({ method, url, headers: { authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }) });

  it('derives progress from persisted task state and exposes a timeline of accepted real actions only', async () => {
    const { patient, doctor, plan, medication, firstTask, doctorToken, patientToken } = await fixture();
    const complete = await request('POST', `/v1/patients/me/treatment/tasks/${firstTask.id}/complete`, patientToken); const completeReplay = await request('POST', `/v1/patients/me/treatment/tasks/${firstTask.id}/complete`, patientToken); expect(complete.statusCode).toBe(200); expect(completeReplay.statusCode).toBe(200);
    const key = `progress-${randomUUID()}`; const adherence = await request('POST', `/v1/patients/me/treatment/medications/${medication.id}/adherence`, patientToken, { treatmentTaskId: firstTask.id }, { 'idempotency-key': key }); const adherenceReplay = await request('POST', `/v1/patients/me/treatment/medications/${medication.id}/adherence`, patientToken, { treatmentTaskId: firstTask.id }, { 'idempotency-key': key }); expect(adherence.statusCode).toBe(200); expect(adherenceReplay.statusCode).toBe(200);
    const patientProgress = await request('GET', `/v1/patients/me/treatment-plans/${plan.id}/progress`, patientToken); expect(patientProgress.statusCode).toBe(200); expect(patientProgress.json()).toMatchObject({ treatmentPlanId: plan.id, percentage: 50, completedTasks: 1, totalTasks: 2, timeline: expect.arrayContaining([expect.objectContaining({ eventType: 'TASK_COMPLETED', treatmentTaskId: firstTask.id }), expect.objectContaining({ eventType: 'MEDICATION_ADHERENCE_RECORDED', treatmentTaskId: firstTask.id })]) }); expect((patientProgress.json().timeline as unknown[])).toHaveLength(2);
    const adminProgress = await request('GET', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/progress`, doctorToken); expect(adminProgress.statusCode).toBe(200); expect(adminProgress.json()).toMatchObject({ percentage: 50, completedTasks: 1, totalTasks: 2 });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: doctor.id } });
    const denied = await request('GET', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/progress`, doctorToken); expect(denied.statusCode).toBe(403);
  });
});
