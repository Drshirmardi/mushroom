import { randomUUID } from 'node:crypto';

import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { ClinicalNotesService } from '../src/modules/clinical/clinical-notes.service';
import { ClinicalReconciliationService, CLINICAL_RECORD_KINDS } from '../src/modules/clinical/clinical-reconciliation.service';
import { PatientClinicalHistoryService } from '../src/modules/clinical/patient-clinical-history.service';
import { ClinicalPermissionService } from '../src/common/auth/clinical-permission.service';
import { ClinicalResourceAccessService } from '../src/modules/clinical/clinical-resource-access.service';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('clinical note revisions (PostgreSQL integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let notes: ClinicalNotesService;
  let reconciliation: ClinicalReconciliationService;
  let patientHistory: PatientClinicalHistoryService;
  let clinicalPermissions: ClinicalPermissionService;
  let clinicalAccess: ClinicalResourceAccessService;
  const userIds = new Set<string>();

  beforeAll(async () => {
    app = await createApiApplication();
    await app.init();
    prisma = app.get(PrismaService);
    notes = app.get(ClinicalNotesService);
    reconciliation = app.get(ClinicalReconciliationService);
    patientHistory = app.get(PatientClinicalHistoryService);
    clinicalPermissions = app.get(ClinicalPermissionService);
    clinicalAccess = app.get(ClinicalResourceAccessService);
  }, 30_000);

  afterEach(async () => {
    if (!userIds.size) return;
    const users = [...userIds];
    await prisma.patientAccessAudit.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.clinicalClinicAccess.deleteMany({ where: { userId: { in: users } } });
    await prisma.clinicalRecordRevision.deleteMany({ where: { OR: [{ diagnosis: { patient: { userId: { in: users } } } }, { allergyRecord: { patient: { userId: { in: users } } } }, { conditionRecord: { patient: { userId: { in: users } } } }, { medicationStatement: { patient: { userId: { in: users } } } }] } });
    await prisma.diagnosis.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.allergyRecord.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.conditionRecord.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.medicationStatement.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.clinicalNoteRevision.deleteMany({ where: { clinicalNote: { encounter: { appointment: { idempotencyActorUserId: { in: users } } } } } });
    await prisma.clinicalNote.deleteMany({ where: { encounter: { appointment: { idempotencyActorUserId: { in: users } } } } });
    await prisma.encounter.deleteMany({ where: { appointment: { idempotencyActorUserId: { in: users } } } });
    await prisma.appointment.deleteMany({ where: { idempotencyActorUserId: { in: users } } });
    await prisma.patientMedicalIntakeRevision.deleteMany({ where: { intake: { patient: { userId: { in: users } } } } });
    await prisma.patientMedicalIntake.deleteMany({ where: { patient: { userId: { in: users } } } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    userIds.clear();
  });

  afterAll(async () => { await app.close(); });

  const fixture = async () => {
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const offering = await prisma.doctorService.findFirstOrThrow({ where: { clinicId: clinic.id, isActive: true, publicationStatus: 'PUBLISHED' } });
    const patientUser = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    const clinician = await prisma.user.create({ data: { phone: `+989${Math.floor(Math.random() * 900_000_000 + 100_000_000)}` } });
    userIds.add(patientUser.id); userIds.add(clinician.id);
    const patient = await prisma.patientProfile.create({ data: { userId: patientUser.id, clinicId: clinic.id } });
    const patientSession = await prisma.session.create({ data: { userId: patientUser.id, refreshTokenHash: randomUUID().replaceAll('-', '').repeat(2), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const clinicianSession = await prisma.session.create({ data: { userId: clinician.id, refreshTokenHash: randomUUID().replaceAll('-', '').repeat(2), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const intake = await prisma.patientMedicalIntake.create({ data: { patientId: patient.id, clinicId: clinic.id, currentRevisionNumber: 1 } });
    const intakeRevision = await prisma.patientMedicalIntakeRevision.create({ data: { intakeId: intake.id, revisionNumber: 1, assignedSchemaVersion: 1, revisionState: 'DRAFT', allergyReport: { status: 'PRESENT', items: ['self-reported'] }, chronicConditionReport: { status: 'UNKNOWN', items: [] }, currentMedicationReport: { status: 'NONE', items: [] }, recordingMode: 'PATIENT_ENTRY', reportedPatientId: patient.id, payloadHash: randomUUID().replaceAll('-', '').repeat(2) } });
    const appointment = await prisma.appointment.create({ data: { clinicId: clinic.id, patientId: patient.id, doctorServiceId: offering.id, doctorId: offering.doctorId, startsAt: new Date(Date.now() - 30 * 60_000), endsAt: new Date(Date.now() + 30 * 60_000), status: 'IN_PROGRESS', startedAt: new Date(), priceAmount: offering.priceAmount, currency: offering.currency, priceCapturedAt: new Date(), idempotencyActorUserId: clinician.id, idempotencyKey: randomUUID(), idempotencyRequestHash: randomUUID().replaceAll('-', '').repeat(2) } });
    const encounter = await prisma.encounter.create({ data: { clinicId: clinic.id, appointmentId: appointment.id, patientId: patient.id, doctorId: offering.doctorId, startedByUserId: clinician.id } });
    return { encounter, clinician, clinicianSession, patient, patientUser, patientSession, intake, intakeRevision };
  };

  it('keeps private note history append-only, detects stale saves, and signs exact revisions', async () => {
    const { encounter, clinician, clinicianSession, patient } = await fixture();
    const auditContext = { actorUserId: clinician.id, actorSessionId: clinicianSession.id, requestId: 'clinical-note-write-test', ipAddress: '127.0.0.1' };
    const created = await notes.create(encounter.id, { expectedRevision: 0, content: 'Initial private clinical observation.' }, clinician.id, auditContext);
    expect(created).toMatchObject({ encounterId: encounter.id, currentRevision: 1, currentEffectiveRevision: 1, latestSignedRevision: null, revision: { revisionNumber: 1, state: 'DRAFT', isPrivate: true, content: 'Initial private clinical observation.', authoredByUserId: clinician.id, authoredAt: expect.any(Date) } });

    const saves = await Promise.allSettled([
      notes.save(created.id, { expectedRevision: 1, content: 'Updated private clinical observation.' }, clinician.id, auditContext),
      notes.save(created.id, { expectedRevision: 1, content: 'Competing private clinical observation.' }, clinician.id, auditContext),
    ]);
    expect(saves.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = saves.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ response: { code: 'CLINICAL_NOTE_REVISION_CONFLICT', details: { currentRevision: 2 } } });
    const saved = saves.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<ClinicalNotesService['save']>>> => result.status === 'fulfilled')!.value;
    expect(saved).toMatchObject({ currentRevision: 2, currentEffectiveRevision: 2, revision: { revisionNumber: 2, previousRevisionId: created.revision.id, state: 'DRAFT', isPrivate: true } });
    await expect(notes.save(created.id, { expectedRevision: 1, content: 'Stale save.' }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_NOTE_REVISION_CONFLICT', details: { currentRevision: 2 } } });

    const signed = await notes.sign(created.id, 2, 2, clinician.id, auditContext);
    expect(signed).toMatchObject({ currentRevision: 2, latestSignedRevision: 2, revision: { id: saved.revision.id, revisionNumber: 2, state: 'SIGNED', signedByUserId: clinician.id, signedAt: expect.any(Date), integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    const repeatedSign = await notes.sign(created.id, 2, 2, clinician.id);
    expect(repeatedSign.revision).toMatchObject({ id: saved.revision.id, state: 'SIGNED', integrityHash: signed.revision.integrityHash });

    await expect(notes.save(created.id, { expectedRevision: 2, content: 'Unexplained signed edit.' }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED' } });
    const amended = await notes.save(created.id, { expectedRevision: 2, content: 'Corrected private clinical observation.', amendmentReasonCategory: 'CLINICAL_CORRECTION' }, clinician.id);
    expect(amended).toMatchObject({ currentRevision: 3, currentEffectiveRevision: 3, latestSignedRevision: 2, revision: { revisionNumber: 3, previousRevisionId: saved.revision.id, state: 'DRAFT', isPrivate: true, amendmentReasonCategory: 'CLINICAL_CORRECTION' } });

    const revisions = await prisma.clinicalNoteRevision.findMany({ where: { clinicalNoteId: created.id }, orderBy: { revisionNumber: 'asc' } });
    expect(revisions).toHaveLength(3);
    expect(revisions[1]).toMatchObject({ id: saved.revision.id, state: 'SIGNED', content: 'Updated private clinical observation.', signedByUserId: clinician.id, integrityHash: signed.revision.integrityHash });
    expect(revisions[2]).toMatchObject({ state: 'DRAFT', content: 'Corrected private clinical observation.', isPrivate: true });
    const audit = await prisma.patientAccessAudit.findMany({ where: { patientId: patient.id, resourceType: 'CLINICAL_NOTE' }, orderBy: { createdAt: 'asc' } });
    expect(audit.map((entry) => entry.action)).toEqual(['CREATE', 'UPDATE', 'SIGN']);
    expect(audit).toEqual(expect.arrayContaining([expect.objectContaining({ actorUserId: clinician.id, actorSessionId: clinicianSession.id, requestId: 'clinical-note-write-test' })]));
    expect(JSON.stringify(audit.map((entry) => entry.metadata))).not.toContain('clinical observation');
  });

  it('creates all reviewed clinical record kinds only from explicit immutable intake provenance', async () => {
    const { encounter, clinician, clinicianSession, patient, intake, intakeRevision } = await fixture();
    const auditContext = { actorUserId: clinician.id, actorSessionId: clinicianSession.id, requestId: 'clinical-reconciliation-write-test', ipAddress: '127.0.0.1' };
    const records = await Promise.all(CLINICAL_RECORD_KINDS.map((kind) => reconciliation.reconcile({ kind, patientId: patient.id, encounterId: encounter.id, sourceIntakeId: intake.id, sourceIntakeRevisionId: intakeRevision.id, sourceIntakeRevisionNumber: intakeRevision.revisionNumber, reviewedContent: { reviewedLabel: `${kind}-reviewed` } }, clinician.id, auditContext)));
    expect(records).toHaveLength(4);
    for (const record of records) expect(record).toMatchObject({ state: 'ACTIVE', currentRevision: 1, source: { intakeId: intake.id, intakeRevisionId: intakeRevision.id, intakeRevisionNumber: 1, provenance: 'PATIENT_SELF_REPORTED' }, revision: { revisionNumber: 1, state: 'DRAFT', isPrivate: true, authoredByUserId: clinician.id } });
    expect(await prisma.clinicalRecordRevision.count()).toBeGreaterThanOrEqual(4);
    const diagnosis = records.find((record) => record.kind === 'DIAGNOSIS')!;
    expect(diagnosis.revision.content).toEqual({ reviewedLabel: 'DIAGNOSIS-reviewed' });

    const revised = await reconciliation.revise('DIAGNOSIS', diagnosis.id, { expectedRevision: 1, reviewedContent: { reviewedLabel: 'clinician-corrected' } }, clinician.id, auditContext);
    expect(revised).toMatchObject({ currentRevision: 2, latestSignedRevision: null, revision: { revisionNumber: 2, previousRevisionId: diagnosis.revision.id, state: 'DRAFT', isPrivate: true, content: { reviewedLabel: 'clinician-corrected' }, authoredByUserId: clinician.id } });
    await expect(reconciliation.revise('DIAGNOSIS', diagnosis.id, { expectedRevision: 1, reviewedContent: { reviewedLabel: 'stale' } }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_RECORD_REVISION_CONFLICT', details: { currentRevision: 2 } } });

    const signed = await reconciliation.sign('DIAGNOSIS', diagnosis.id, 2, 2, clinician.id, auditContext);
    expect(signed).toMatchObject({ currentRevision: 2, latestSignedRevision: 2, revision: { id: revised.revision.id, state: 'SIGNED', signedByUserId: clinician.id, signedAt: expect.any(Date), integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    await expect(reconciliation.revise('DIAGNOSIS', diagnosis.id, { expectedRevision: 2, reviewedContent: { reviewedLabel: 'unexplained-signed-edit' } }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_RECORD_AMENDMENT_REASON_REQUIRED' } });
    const amended = await reconciliation.revise('DIAGNOSIS', diagnosis.id, { expectedRevision: 2, reviewedContent: { reviewedLabel: 'corrected-after-signing' }, amendmentReasonCategory: 'CLINICAL_CORRECTION' }, clinician.id);
    expect(amended).toMatchObject({ currentRevision: 3, latestSignedRevision: 2, revision: { revisionNumber: 3, previousRevisionId: revised.revision.id, state: 'DRAFT', amendmentReasonCategory: 'CLINICAL_CORRECTION' } });
    const revisions = await prisma.clinicalRecordRevision.findMany({ where: { diagnosisId: diagnosis.id }, orderBy: { revisionNumber: 'asc' } });
    expect(revisions).toHaveLength(3);
    expect(revisions[1]).toMatchObject({ id: revised.revision.id, state: 'SIGNED', content: { reviewedLabel: 'clinician-corrected' }, signedByUserId: clinician.id, integrityHash: signed.revision.integrityHash });
    expect(revisions[2]).toMatchObject({ state: 'DRAFT', content: { reviewedLabel: 'corrected-after-signing' } });
    const audit = await prisma.patientAccessAudit.findMany({ where: { patientId: patient.id, resourceType: { startsWith: 'CLINICAL_' } }, orderBy: { createdAt: 'asc' } });
    expect(audit.map((entry) => entry.action)).toEqual(expect.arrayContaining(['CREATE', 'UPDATE', 'SIGN']));
    expect(audit).toEqual(expect.arrayContaining([expect.objectContaining({ actorUserId: clinician.id, actorSessionId: clinicianSession.id, requestId: 'clinical-reconciliation-write-test' })]));
    expect(JSON.stringify(audit.map((entry) => entry.metadata))).not.toContain('clinician-corrected');
    await expect(reconciliation.reconcile({ kind: 'DIAGNOSIS', patientId: patient.id, sourceIntakeId: intake.id, sourceIntakeRevisionId: randomUUID(), sourceIntakeRevisionNumber: 1, reviewedContent: { reviewedLabel: 'must-not-create' } }, clinician.id)).rejects.toMatchObject({ response: { code: 'CLINICAL_RECONCILIATION_SOURCE_INVALID' } });
  });

  it('returns only the current explicitly published visit summary to its patient', async () => {
    const { encounter, clinician, patient, patientUser, patientSession } = await fixture();
    const completedAt = new Date();
    await prisma.encounter.update({ where: { id: encounter.id }, data: { state: 'COMPLETED', completedAt, completedByUserId: clinician.id } });
    const publishedAt = new Date(completedAt.getTime() + 1_000);
    await prisma.clinicalNote.create({
      data: {
        clinicId: encounter.clinicId,
        patientId: patient.id,
        encounterId: encounter.id,
        currentRevisionNumber: 2,
        currentEffectiveRevisionNumber: 2,
        latestSignedRevisionNumber: 2,
        currentPublishedRevisionNumber: 2,
        revisions: {
          create: [
            { revisionNumber: 1, state: 'SIGNED', content: 'PRIVATE: superseded clinician observation', isPrivate: true, patientSummary: 'Superseded patient summary', authoredByUserId: clinician.id, signedAt: completedAt, signedByUserId: clinician.id, integrityHash: 'a'.repeat(64), publishedAt, publishedByUserId: clinician.id },
            { revisionNumber: 2, state: 'SIGNED', content: 'PRIVATE: current clinician observation', isPrivate: true, patientSummary: 'Current patient-safe visit summary', authoredByUserId: clinician.id, signedAt: publishedAt, signedByUserId: clinician.id, integrityHash: 'b'.repeat(64), publishedAt, publishedByUserId: clinician.id },
          ],
        },
      },
    });
    await prisma.clinicalNote.create({ data: { clinicId: encounter.clinicId, patientId: patient.id, encounterId: encounter.id, currentRevisionNumber: 1, currentEffectiveRevisionNumber: 1, latestSignedRevisionNumber: 1, revisions: { create: { revisionNumber: 1, state: 'SIGNED', content: 'PRIVATE: signed but unpublished', isPrivate: true, patientSummary: 'Must not be visible', authoredByUserId: clinician.id, signedAt: publishedAt, signedByUserId: clinician.id, integrityHash: 'c'.repeat(64) } } } });
    await prisma.clinicalNote.create({ data: { clinicId: encounter.clinicId, patientId: patient.id, encounterId: encounter.id, currentRevisionNumber: 1, currentEffectiveRevisionNumber: 1, revisions: { create: { revisionNumber: 1, content: 'PRIVATE: draft note', isPrivate: true, patientSummary: 'Also not visible', authoredByUserId: clinician.id } } } });

    const timeline = await patientHistory.timeline(patientUser.id);
    const history = await patientHistory.history(patientUser.id);
    expect(timeline.items).toHaveLength(1);
    expect(timeline.items[0]).toMatchObject({ encounterId: encounter.id, appointmentId: encounter.appointmentId, completedAt, revisionNumber: 2, patientSummary: 'Current patient-safe visit summary', publishedAt });
    expect(timeline.items[0]).not.toHaveProperty('content');
    expect(JSON.stringify(timeline)).not.toContain('PRIVATE:');
    expect(history.items).toEqual(timeline.items);
    await expect(patientHistory.summary(patientUser.id, encounter.appointmentId)).resolves.toMatchObject({ revisionNumber: 2, patientSummary: 'Current patient-safe visit summary' });
    await expect(patientHistory.auditedSummary(patientUser.id, encounter.appointmentId, { actorUserId: patientUser.id, actorSessionId: patientSession.id, requestId: 'clinical-summary-test', ipAddress: '127.0.0.1' })).resolves.toMatchObject({ revisionNumber: 2, patientSummary: 'Current patient-safe visit summary' });
    const audit = await prisma.patientAccessAudit.findFirstOrThrow({ where: { patientId: patient.id, resourceType: 'PATIENT_CLINICAL_HISTORY' } });
    expect(audit).toMatchObject({ action: 'READ', actorUserId: patientUser.id, actorSessionId: patientSession.id, resourceId: encounter.appointmentId, requestId: 'clinical-summary-test', metadata: { view: 'SUMMARY' } });
    expect(JSON.stringify(audit.metadata)).not.toContain('PRIVATE:');
  });

  it('requires both a configured clinical capability and a matching clinic resource grant', async () => {
    const { clinician, patient } = await fixture();
    const clinic = await prisma.clinic.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'DOCTOR' } });
    expect(await clinicalPermissions.allows(['DOCTOR'], ['clinical:record:view'])).toBe(false);
    await prisma.clinicalRolePermission.create({ data: { roleId: role.id, permission: 'CLINICAL_RECORD_VIEW' } });
    await prisma.clinicalClinicAccess.create({ data: { userId: clinician.id, clinicId: clinic.id } });
    expect(await clinicalPermissions.allows(['DOCTOR'], ['clinical:record:view'])).toBe(true);
    await expect(clinicalAccess.patient(clinician.id, patient.id)).resolves.toMatchObject({ id: patient.id, clinicId: clinic.id });
    await expect(clinicalAccess.patient(clinician.id, randomUUID())).rejects.toMatchObject({ response: { code: 'CLINICAL_RESOURCE_FORBIDDEN' } });
    await prisma.clinicalRolePermission.delete({ where: { roleId_permission: { roleId: role.id, permission: 'CLINICAL_RECORD_VIEW' } } });
  });
});
