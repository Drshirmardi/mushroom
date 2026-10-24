import { completeTestPatientEntry, clearTestPatientEntries } from './patient-entry-test-support';
import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AccessTokenService } from '../src/common/auth/access-token.service';
import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('treatment-plan API (PostgreSQL integration)', () => {
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
    await prisma.treatmentSessionPlan.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.treatmentMedication.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.exercisePlan.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
    await prisma.nutritionPlan.deleteMany({ where: { treatmentPlan: { patient: { userId: { in: users } } } } });
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
    const requiredPermissions = ['CLINICAL_RECORD_VIEW', 'CLINICAL_RECORD_EDIT'] as const;
    const existing = new Set((await prisma.clinicalRolePermission.findMany({ where: { roleId: doctorRole.id, permission: { in: [...requiredPermissions] } }, select: { permission: true } })).map((entry) => entry.permission));
    const missing = requiredPermissions.filter((permission) => !existing.has(permission));
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

  const request = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: unknown) => {
    if (payload === undefined) return app.inject({ method, url, headers: { authorization: `Bearer ${token}` } });
    return app.inject({ method, url, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
  };

  it('creates, updates, and exposes ordered treatment definitions without F07-T05 execution fields', async () => {
    const { patient, doctorToken, patientToken } = await fixture();
    const created = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans`, doctorToken, {
      title: ' Recovery plan ',
      medications: [{ name: ' Herb blend ', dosage: '10 ml', instructions: 'After food' }],
      sessionPlans: [
        { position: 2, title: 'Second treatment', goals: ['Reduce pain'], patientInstructions: 'Drink water' },
        { position: 1, title: 'First treatment', goals: ['Improve mobility'], instructions: 'Clinical protocol' },
      ],
      exercisePlans: [{ title: 'Gentle walking', instructions: '20 minutes' }],
      nutritionPlans: [{ title: 'Warm meals', instructions: 'Avoid cold drinks' }],
    });
    expect(created.statusCode).toBe(201);
    const plan = created.json() as { id: string; state: string; medications: Array<{ id: string; name: string }>; sessionPlans: Array<{ id: string; position: number; title: string; goals: string[]; patientInstructions: string | null }>; exercisePlans: Array<{ id: string }>; nutritionPlans: Array<{ id: string }> };
    expect(plan).toMatchObject({ state: 'DRAFT', medications: [{ name: 'Herb blend' }], sessionPlans: [{ position: 1, title: 'First treatment', goals: ['Improve mobility'] }, { position: 2, title: 'Second treatment', patientInstructions: 'Drink water' }] });
    expect(plan.sessionPlans.map((session) => session.position)).toEqual([1, 2]);
    expect(plan.sessionPlans[0]).not.toHaveProperty('treatmentPlanId');

    const duplicate = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/sessions`, doctorToken, { position: 1, title: 'Duplicate', goals: [] });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ code: 'TREATMENT_SESSION_POSITION_CONFLICT' });

    const forbiddenSchedule = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/sessions`, doctorToken, { position: 3, title: 'Third treatment', goals: [], scheduledFor: '2026-09-05T09:00:00.000Z' });
    expect(forbiddenSchedule.statusCode).toBe(400);

    const updatedSession = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/sessions/${plan.sessionPlans[0]!.id}`, doctorToken, { title: 'Updated first treatment', goals: ['Improve mobility', 'Reduce tension'] });
    expect(updatedSession.statusCode).toBe(200);
    expect(updatedSession.json()).toMatchObject({ title: 'Updated first treatment', goals: ['Improve mobility', 'Reduce tension'] });

    const active = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}`, doctorToken, { state: 'ACTIVE' });
    expect(active.statusCode).toBe(200);
    expect(active.json()).toMatchObject({ state: 'ACTIVE' });

    const patientRead = await request('GET', '/v1/patients/me/treatment-plans', patientToken);
    expect(patientRead.statusCode).toBe(200);
    const patientPlans = patientRead.json() as { items: Array<{ id: string; sessionPlans: Array<{ position: number; title: string }>; medications: Array<{ name: string }> }> };
    expect(patientPlans.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: plan.id, sessionPlans: expect.arrayContaining([expect.objectContaining({ position: 1, title: 'Updated first treatment' })]), medications: expect.arrayContaining([expect.objectContaining({ name: 'Herb blend' })]) })]));

    const audit = await prisma.patientAccessAudit.findMany({ where: { patientId: patient.id, resourceType: { in: ['TREATMENT_PLAN', 'TREATMENT_SESSION_PLAN', 'PATIENT_TREATMENT_PLAN'] } }, select: { action: true, resourceType: true } });
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'CREATE', resourceType: 'TREATMENT_PLAN' }),
      expect.objectContaining({ action: 'UPDATE', resourceType: 'TREATMENT_SESSION_PLAN' }),
      expect.objectContaining({ action: 'READ', resourceType: 'PATIENT_TREATMENT_PLAN' }),
    ]));
  });

  it('enforces clinic resource scope and keeps completed plans definition-immutable', async () => {
    const { patient, clinician, doctorToken } = await fixture();
    const created = await request('POST', `/v1/admin/patients/${patient.id}/treatment-plans`, doctorToken, { title: 'Plan', sessionPlans: [{ position: 1, title: 'Session', goals: [] }] });
    const plan = created.json() as { id: string; sessionPlans: Array<{ id: string }> };
    const completed = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}`, doctorToken, { state: 'ACTIVE' });
    expect(completed.statusCode).toBe(200);
    const final = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}`, doctorToken, { state: 'COMPLETED' });
    expect(final.statusCode).toBe(200);
    const editCompleted = await request('PATCH', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}/sessions/${plan.sessionPlans[0]!.id}`, doctorToken, { title: 'Not allowed' });
    expect(editCompleted.statusCode).toBe(422);
    expect(editCompleted.json()).toMatchObject({ code: 'TREATMENT_PLAN_NOT_EDITABLE' });

    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: clinician.id } });
    const denied = await request('GET', `/v1/admin/patients/${patient.id}/treatment-plans/${plan.id}`, doctorToken);
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ code: 'CLINICAL_RESOURCE_FORBIDDEN' });
  });

  it('declares the F07-T04 routes in runtime OpenAPI without synchronizing the checked-in client', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    expect(response.statusCode).toBe(200);
    const document = response.json() as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty('/v1/admin/patients/{patientId}/treatment-plans/{planId}/sessions');
    expect(document.paths).toHaveProperty('/v1/patients/me/treatment-plans');
  });
});
