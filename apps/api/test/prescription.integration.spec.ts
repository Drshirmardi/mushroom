import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { PrescriptionService } from '../src/modules/clinical/prescription.service';
import type { RoleCode } from '../src/common/auth/authorization.policy';

describe('prescription lifecycle API (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let prescriptions: PrescriptionService;
  const userIds = new Set<string>();
  const createdDoctorPermissions = new Set<'CLINICAL_RECORD_VIEW' | 'CLINICAL_RECORD_EDIT' | 'CLINICAL_RECORD_SIGN' | 'CLINICAL_RECORD_AMEND'>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    prescriptions = app.get(PrescriptionService);
  }, 30_000);

  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.prescriptionSafetyAcknowledgement.deleteMany({ where: { prescriptionRevision: { prescription: { patient: { userId: { in: users } } } } } });
    await prisma.prescriptionItem.deleteMany({ where: { prescriptionRevision: { prescription: { patient: { userId: { in: users } } } } } });
    await prisma.prescriptionRevision.deleteMany({ where: { prescription: { patient: { userId: { in: users } } } } });
    await prisma.prescription.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: { in: users } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: users } } });
    if (createdDoctorPermissions.size) {
      await prisma.clinicalRolePermission.deleteMany({ where: { role: { code: 'DOCTOR' }, permission: { in: [...createdDoctorPermissions] } } });
      createdDoctorPermissions.clear();
    }
    await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    userIds.clear();
  });

  afterAll(async () => { await app.close(); });

  const fixture = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } });
    const [patientUser, clinician] = await Promise.all([
      prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }),
      prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } }),
    ]);
    userIds.add(patientUser.id); userIds.add(clinician.id);
    const patient = await prisma.patientProfile.create({ data: { userId: patientUser.id, clinicId: clinic.id } });
    await prisma.userRole.create({ data: { userId: clinician.id, roleId: doctorRole.id } });
    await prisma.clinicalClinicAccess.create({ data: { userId: clinician.id, clinicId: clinic.id } });
    const requiredPermissions = ['CLINICAL_RECORD_VIEW', 'CLINICAL_RECORD_EDIT', 'CLINICAL_RECORD_SIGN', 'CLINICAL_RECORD_AMEND'] as const;
    const existingPermissions = new Set((await prisma.clinicalRolePermission.findMany({ where: { roleId: doctorRole.id, permission: { in: [...requiredPermissions] } }, select: { permission: true } })).map((entry) => entry.permission));
    const missingPermissions = requiredPermissions.filter((permission) => !existingPermissions.has(permission));
    if (missingPermissions.length) {
      await prisma.clinicalRolePermission.createMany({ data: missingPermissions.map((permission) => ({ roleId: doctorRole.id, permission })), skipDuplicates: true });
      for (const permission of missingPermissions) createdDoctorPermissions.add(permission);
    }
    return { patient, clinician, actor: { actorUserId: clinician.id, roles: ['DOCTOR'] as RoleCode[] } };
  };

  it('creates drafts, serializes revisions, issues an exact revision, and preserves issued evidence', async () => {
    const { patient, clinician, actor } = await fixture();
    const created = await prescriptions.create(patient.id, { expectedRevision: 0, items: [{ medicationName: ' Initial medicine ', doseText: '10 mg', frequencyText: 'daily' }] }, actor);
    expect(created).toMatchObject({ patientId: patient.id, currentRevision: 1, currentIssuedRevision: null, revision: { revisionNumber: 1, state: 'DRAFT', authoredByUserId: clinician.id, items: [{ position: 1, medicationName: 'Initial medicine', doseText: '10 mg' }] } });

    const revisions = await Promise.allSettled([
      prescriptions.save(patient.id, created.id, { expectedRevision: 1, items: [{ medicationName: 'Updated medicine', doseText: '20 mg', instructions: 'With food' }] }, actor),
      prescriptions.save(patient.id, created.id, { expectedRevision: 1, items: [{ medicationName: 'Competing medicine' }] }, actor),
    ]);
    expect(revisions.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = revisions.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ response: { code: 'PRESCRIPTION_REVISION_CONFLICT', details: { currentRevision: 2 } } });
    const saved = revisions.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<PrescriptionService['save']>>> => result.status === 'fulfilled')!.value;
    expect(saved).toMatchObject({ currentRevision: 2, revision: { revisionNumber: 2, previousRevisionId: created.revision!.id, state: 'DRAFT', items: [{ medicationName: 'Updated medicine' }] } });

    const issued = await prescriptions.issue(patient.id, created.id, { revisionNumber: 2, expectedRevision: 2 }, actor);
    expect(issued).toMatchObject({ currentRevision: 2, currentIssuedRevision: 2, latestIssuedRevision: 2, revision: { id: saved.revision!.id, state: 'ISSUED', issuedByUserId: clinician.id, issuedAt: expect.any(Date), integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    await expect(prescriptions.save(patient.id, created.id, { expectedRevision: 2, items: [{ medicationName: 'Unsafe overwrite' }] }, actor)).rejects.toMatchObject({ response: { code: 'PRESCRIPTION_AMENDMENT_REASON_REQUIRED' } });

    const amended = await prescriptions.save(patient.id, created.id, { expectedRevision: 2, amendmentReasonCategory: 'CLINICAL_CORRECTION', items: [{ medicationName: 'Corrected medicine', durationText: '14 days' }] }, actor);
    expect(amended).toMatchObject({ currentRevision: 3, currentIssuedRevision: 2, revision: { revisionNumber: 3, previousRevisionId: saved.revision!.id, state: 'DRAFT', amendmentReasonCategory: 'CLINICAL_CORRECTION' } });
    const reissued = await prescriptions.issue(patient.id, created.id, { revisionNumber: 3, expectedRevision: 3 }, actor);
    expect(reissued).toMatchObject({ currentIssuedRevision: 3, latestIssuedRevision: 3, revision: { state: 'ISSUED', revisionNumber: 3 } });

    const history = await prisma.prescriptionRevision.findMany({ where: { prescriptionId: created.id }, orderBy: { revisionNumber: 'asc' }, include: { items: { orderBy: { position: 'asc' } } } });
    expect(history).toHaveLength(3);
    expect(history[1]).toMatchObject({ id: saved.revision!.id, state: 'ISSUED', integrityHash: issued.revision!.integrityHash, items: [{ medicationName: 'Updated medicine', instructions: 'With food' }] });
    expect(history[2]).toMatchObject({ state: 'ISSUED', previousRevisionId: saved.revision!.id, items: [{ medicationName: 'Corrected medicine' }] });
  });

  it('requires a configured capability and matching clinic resource grant before exposing prescriptions', async () => {
    const { patient, actor } = await fixture();
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: actor.actorUserId } });
    await expect(prescriptions.list(patient.id, actor)).rejects.toMatchObject({ response: { code: 'CLINICAL_RESOURCE_FORBIDDEN' } });
    await prisma.clinicalClinicAccess.create({ data: { userId: actor.actorUserId, clinicId: patient.clinicId } });
    const listed = await prescriptions.list(patient.id, actor, undefined, 1);
    expect(listed).toEqual({ items: [], nextCursor: null });
    await expect(prescriptions.get(patient.id, randomUUID(), actor)).rejects.toMatchObject({ response: { code: 'PRESCRIPTION_RESOURCE_FORBIDDEN' } });
  });
});
