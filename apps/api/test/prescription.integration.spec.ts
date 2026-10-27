import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { ClinicalPermissionService } from '../src/common/auth/clinical-permission.service';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { PrescriptionService } from '../src/modules/clinical/prescription.service';
import type { RoleCode } from '../src/common/auth/authorization.policy';

describe('prescription lifecycle API (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let accessTokens: AccessTokenService;
  let prisma: PrismaService;
  let clinicalPermissions: ClinicalPermissionService;
  let prescriptions: PrescriptionService;
  const userIds = new Set<string>();
  const createdDoctorPermissions = new Set<'CLINICAL_RECORD_VIEW' | 'CLINICAL_RECORD_EDIT' | 'CLINICAL_RECORD_SIGN' | 'CLINICAL_RECORD_AMEND'>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    accessTokens = app.get(AccessTokenService);
    prisma = app.get(PrismaService);
    clinicalPermissions = app.get(ClinicalPermissionService);
    prescriptions = app.get(PrescriptionService);
  }, 30_000);

  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.prescriptionSafetyAcknowledgement.deleteMany({ where: { prescriptionRevision: { prescription: { patient: { userId: { in: users } } } } } });
    await prisma.prescriptionItem.deleteMany({ where: { prescriptionRevision: { prescription: { patient: { userId: { in: users } } } } } });
    await prisma.prescriptionRevision.deleteMany({ where: { prescription: { patient: { userId: { in: users } } } } });
    await prisma.prescription.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.patientAccessAudit.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.session.deleteMany({ where: { userId: { in: users } } });
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
    const session = await prisma.session.create({ data: { userId: clinician.id, refreshTokenHash: randomUUID().replace(/-/g, '').padEnd(64, '0'), expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.clinicalClinicAccess.create({ data: { userId: clinician.id, clinicId: clinic.id } });
    const requiredPermissions = ['CLINICAL_RECORD_VIEW', 'CLINICAL_RECORD_EDIT', 'CLINICAL_RECORD_SIGN', 'CLINICAL_RECORD_AMEND'] as const;
    const existingPermissions = new Set((await prisma.clinicalRolePermission.findMany({ where: { roleId: doctorRole.id, permission: { in: [...requiredPermissions] } }, select: { permission: true } })).map((entry) => entry.permission));
    const missingPermissions = requiredPermissions.filter((permission) => !existingPermissions.has(permission));
    if (missingPermissions.length) {
      await prisma.clinicalRolePermission.createMany({ data: missingPermissions.map((permission) => ({ roleId: doctorRole.id, permission })), skipDuplicates: true });
      for (const permission of missingPermissions) createdDoctorPermissions.add(permission);
    }
    const token = await accessTokens.issue({ userId: clinician.id, sessionId: session.id, roles: ['DOCTOR'] });
    return { patient, clinician, token, actor: { actorUserId: clinician.id, actorSessionId: session.id, requestId: randomUUID(), ipAddress: '127.0.0.1', roles: ['DOCTOR'] as RoleCode[] } };
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
    const savedIndex = revisions.findIndex((result) => result.status === 'fulfilled');
    const saved = (revisions[savedIndex] as PromiseFulfilledResult<Awaited<ReturnType<PrescriptionService['save']>>>).value;
    const winningItem = savedIndex === 0
      ? { medicationName: 'Updated medicine', doseText: '20 mg', instructions: 'With food' }
      : { medicationName: 'Competing medicine' };
    expect(saved).toMatchObject({ currentRevision: 2, revision: { revisionNumber: 2, previousRevisionId: created.revision!.id, state: 'DRAFT', items: [winningItem] } });

    const issued = await prescriptions.issue(patient.id, created.id, { revisionNumber: 2, expectedRevision: 2 }, actor);
    expect(issued).toMatchObject({ currentRevision: 2, currentIssuedRevision: 2, latestIssuedRevision: 2, revision: { id: saved.revision!.id, state: 'ISSUED', issuedByUserId: clinician.id, issuedAt: expect.any(Date), integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    await expect(prescriptions.save(patient.id, created.id, { expectedRevision: 2, items: [{ medicationName: 'Unsafe overwrite' }] }, actor)).rejects.toMatchObject({ response: { code: 'PRESCRIPTION_AMENDMENT_REASON_REQUIRED' } });
    await expect(prisma.patientAccessAudit.findFirstOrThrow({ where: { patientId: patient.id, resourceId: created.id, resourceRevisionId: saved.revision!.id } })).resolves.toMatchObject({ action: 'SIGN', actorUserId: clinician.id, metadata: { revisionNumber: 2 } });
    expect(await prisma.prescriptionSafetyAcknowledgement.count({ where: { prescriptionRevisionId: saved.revision!.id } })).toBe(0);

    const amended = await prescriptions.save(patient.id, created.id, { expectedRevision: 2, amendmentReasonCategory: 'CLINICAL_CORRECTION', items: [{ medicationName: 'Corrected medicine', durationText: '14 days' }] }, actor);
    expect(amended).toMatchObject({ currentRevision: 3, currentIssuedRevision: 2, revision: { revisionNumber: 3, previousRevisionId: saved.revision!.id, state: 'DRAFT', amendmentReasonCategory: 'CLINICAL_CORRECTION' } });
    const reissued = await prescriptions.issue(patient.id, created.id, { revisionNumber: 3, expectedRevision: 3 }, actor);
    expect(reissued).toMatchObject({ currentIssuedRevision: 3, latestIssuedRevision: 3, revision: { state: 'ISSUED', revisionNumber: 3 } });

    const history = await prisma.prescriptionRevision.findMany({ where: { prescriptionId: created.id }, orderBy: { revisionNumber: 'asc' }, include: { items: { orderBy: { position: 'asc' } } } });
    expect(history).toHaveLength(3);
    expect(history[1]).toMatchObject({ id: saved.revision!.id, state: 'ISSUED', integrityHash: issued.revision!.integrityHash, items: [winningItem] });
    expect(history[2]).toMatchObject({ state: 'ISSUED', previousRevisionId: saved.revision!.id, items: [{ medicationName: 'Corrected medicine' }] });
  });

  it('uses only the explicit DOCTOR issuance capability and the existing clinic-resource boundary', async () => {
    expect(await clinicalPermissions.allows(['DOCTOR'], ['prescription:issue'])).toBe(true);
    expect(await clinicalPermissions.allows(['ADMIN'], ['prescription:issue'])).toBe(false);
    expect(await clinicalPermissions.allows(['STAFF'], ['prescription:issue'])).toBe(false);

    const { patient, token, actor } = await fixture();
    const created = await prescriptions.create(patient.id, { expectedRevision: 0, items: [{ medicationName: 'Capability boundary medicine' }] }, actor);
    const adminUser = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(adminUser.id);
    const adminSessionId = randomUUID();
    await prisma.session.create({ data: { id: adminSessionId, userId: adminUser.id, refreshTokenHash: randomUUID().replaceAll('-', '').repeat(2), expiresAt: new Date(Date.now() + 3_600_000) } });
    const adminToken = await accessTokens.issue({ userId: adminUser.id, sessionId: adminSessionId, roles: ['ADMIN'] });
    const roleOnlyAdmin = await app.inject({
      method: 'POST',
      url: `/v1/admin/patients/${patient.id}/prescriptions/${created.id}/issue`,
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ revisionNumber: 1, expectedRevision: 1 }),
    });
    expect(roleOnlyAdmin.statusCode).toBe(403);

    const issued = await app.inject({
      method: 'POST',
      url: `/v1/admin/patients/${patient.id}/prescriptions/${created.id}/issue`,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ revisionNumber: 1, expectedRevision: 1 }),
    });
    expect(issued.statusCode).toBe(200);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } });
    const ungrantedClinician = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(ungrantedClinician.id);
    await prisma.userRole.create({ data: { userId: ungrantedClinician.id, roleId: doctorRole.id } });

    await expect(prescriptions.issue(patient.id, created.id, { revisionNumber: 1, expectedRevision: 1 }, {
      actorUserId: ungrantedClinician.id,
      actorSessionId: randomUUID(),
      requestId: randomUUID(),
      ipAddress: '127.0.0.1',
      roles: ['DOCTOR'],
    })).rejects.toMatchObject({ response: { code: 'CLINICAL_RESOURCE_FORBIDDEN' } });
  });

  it('requires a configured capability and matching clinic resource grant before exposing prescriptions', async () => {
    const { patient, actor } = await fixture();
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: actor.actorUserId } });
    await expect(prescriptions.list(patient.id, actor)).rejects.toMatchObject({ response: { code: 'CLINICAL_RESOURCE_FORBIDDEN' } });
    await prisma.clinicalClinicAccess.create({ data: { userId: actor.actorUserId, clinicId: patient.clinicId } });
    const listed = await prescriptions.list(patient.id, actor, undefined, 1);
    expect(listed).toEqual({ patientDisplayName: null, items: [], nextCursor: null });
    await expect(prescriptions.get(patient.id, randomUUID(), actor)).rejects.toMatchObject({ response: { code: 'PRESCRIPTION_RESOURCE_FORBIDDEN' } });
  });
});
